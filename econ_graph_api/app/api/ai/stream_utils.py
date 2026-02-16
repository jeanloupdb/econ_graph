
async def stream_chat_generator(
    project_id: str,
    content: str,
    context_data: Optional[dict],
    db: Session,
    current_user: User
):
    """Generator for streaming chat responses."""
    
    # Setup (copy-paste of context building logic)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        yield f"data: {json.dumps({'error': 'Project not found'})}\n\n"
        return

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).all()
    nodes_map = {n.slug: n for n in nodes}

    conversation = get_or_create_conversation(db, project_id)
    existing_messages = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conversation.id
    ).order_by(ConversationMessage.created_at).all()

    # Save user message
    user_message = ConversationMessage(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        role="user",
        content=content,
        extra_data={"context": context_data} if context_data else None,
        created_at=datetime.utcnow()
    )
    db.add(user_message)
    # We commit early so it's saved even if streaming fails mid-way
    db.commit()

    try:
        configure_gemini()
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            tools=[GRAPH_TOOLS]
        )

        system_prompt = PROJECT_CHAT_SYSTEM_PROMPT.format(
            project_name=project.name,
            node_count=len(nodes),
            nodes_context=build_nodes_context(nodes, edges)
        )

        conversation_history = build_conversation_context(existing_messages)
        # Note: we don't append the *current* user message to history because prompt is passed to send_message

        # Start chat
        chat = model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]},
            {"role": "model", "parts": ["Compris. Je peux modifier le graphe."]},
            *conversation_history
        ])

        # Initial request
        current_response_stream = chat.send_message(content, stream=True)
        
        full_ai_response_text = ""
        actions_performed = []
        total_prompt_tokens = 0
        total_completion_tokens = 0
        
        # Loop for handling multi-turn tool use
        max_iterations = 5
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            
            function_calls_in_turn = []
            text_in_turn = ""

            # Consume the stream
            for chunk in current_response_stream:
                # Accumulate text
                if chunk.text:
                    text_chunk = chunk.text
                    text_in_turn += text_chunk
                    full_ai_response_text += text_chunk
                    # Yield text event
                    yield f"data: {json.dumps({'type': 'content', 'content': text_chunk})}\n\n"

                # Check for function calls (they might come in parts or full, but usually full in one chunk for gemini python sdk?)
                # Actually Gemini Python SDK usually buffers function calls.
                # Let's check candidates
                if chunk.candidates and chunk.candidates[0].content.parts:
                    for part in chunk.candidates[0].content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            # It's a function call. 
                            # Note: Streaming function calls with Gemini SDK can be tricky. 
                            # Usually the SDK constructs the full object for us in the chunk if we iterate.
                            fc = part.function_call
                            if fc not in function_calls_in_turn and fc.name:
                                function_calls_in_turn.append(fc)

            # End of this stream turn.
            # If we had text but no function calls, we are done.
            if not function_calls_in_turn:
                break
                
            # If we have function calls, execute them
            function_responses = []
            
            for fc in function_calls_in_turn:
                tool_name = fc.name
                tool_args = _proto_to_dict(fc.args) if fc.args else {}
                
                # Notify frontend of tool execution start
                yield f"data: {json.dumps({'type': 'action_start', 'tool': tool_name, 'args': tool_args})}\n\n"
                
                # Execute
                result = execute_tool(tool_name, tool_args, db, project_id, nodes_map)
                
                actions_performed.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": result
                })
                
                function_responses.append({
                    "function_response": {
                        "name": tool_name,
                        "response": result
                    }
                })
                
                # Notify frontend of tool result
                yield f"data: {json.dumps({'type': 'action_result', 'tool': tool_name, 'result': result})}\n\n"

            # Send results back to model and continue streaming
            current_response_stream = chat.send_message(
                {"parts": function_responses},
                stream=True
            )

        # Final save of AI message
        extra_data = {
            "prompt_tokens": total_prompt_tokens, # Note: Token counting with stream is harder, skipping or estimating
            "completion_tokens": total_completion_tokens,
            "actions": actions_performed
        }
        if context_data:
            extra_data["context"] = context_data

        ai_message = ConversationMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=full_ai_response_text,
            extra_data=extra_data,
            created_at=datetime.utcnow()
        )
        db.add(ai_message)
        conversation.updated_at = datetime.utcnow()
        db.commit()
        
        # Done
        yield f"data: {json.dumps({'type': 'done', 'message_id': ai_message.id})}\n\n"
        
    except Exception as e:
        logger.error("Stream error", error=str(e))
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
