# Modèles de Données

## Schéma de Base de Données (PostgreSQL)

### Project
L'entité racine.
*   `id` (PK): String (UUID custom `proj_...`)
*   `name`: String
*   `description`: Text (Optionnel)
*   `user_id`: FK vers User
*   `public_view_token`: String (Token unique pour le partage public en lecture seule)
*   `created_at`, `updated_at`: Timestamps

### Node
Les briques élémentaires du graphe.
*   `id` (PK): UUID
*   `project_id`: FK vers Project
*   `slug`: String (Identifiant unique lisible dans le projet, ex: `chiffre_affaires`)
*   `label`: String (Nom d'affichage, ex: "Chiffre d'Affaires")
*   `type`: Enum (parameter, computed, composite)
*   `unit`: String (ex: "EUR", "%", "Clients")
*   `computation_definition`: Text (Code Python de la fonction `compute`)
*   `pos_x`, `pos_y`: Float (Coordonnées pour le canvas)
*   `status`: Enum (imposed, implied) - *Legacy, tend à disparaître*

### Edge
Les connexions entre les nœuds.
*   `id` (PK): UUID
*   `project_id`: FK vers Project
*   `source`: FK vers Node (Output)
*   `target`: FK vers Node (Input)
*   `edge_type`: String (dependency, hierarchy)

### Scenario
Variantes de simulation.
*   `id` (PK): UUID
*   `project_id`: FK vers Project
*   `name`: String (ex: "Best Case")

### ScenarioNodeOverride
Surcharges de valeurs pour un scénario donné.
*   `id` (PK): UUID
*   `scenario_id`: FK vers Scenario
*   `node_id`: FK vers Node
*   `mode`: Enum (value, formula)
*   `override_value`: Float (La valeur forcée)
*   `override_definition`: Text (La formule forcée - *Pas encore pleinement implémenté*)

## Relations Clés
*   Un **Project** a plusieurs **Nodes** et **Edges**.
*   Un **Edge** relie deux **Nodes** du même **Project**.
*   Un **Node** "computed" utilise les valeurs des **Nodes** connectés en entrée via ses arguments de fonction Python.
*   Un **Scenario** appartient à un **Project** et contient plusieurs **Overrides**.
