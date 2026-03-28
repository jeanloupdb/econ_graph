import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-300 flex flex-col items-center px-4 py-16">
      <div className="max-w-2xl w-full">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8 inline-block">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">Conditions d&apos;utilisation</h1>

        <div className="space-y-6 text-[15px] leading-relaxed text-zinc-400">
          <section>
            <h2 className="text-zinc-200 font-semibold mb-2">1. Acceptation des conditions</h2>
            <p>En utilisant SmartGraph, vous acceptez les présentes conditions d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser le service.</p>
          </section>

          <section>
            <h2 className="text-zinc-200 font-semibold mb-2">2. Description du service</h2>
            <p>SmartGraph est un outil de modélisation économique assisté par intelligence artificielle. Il permet de créer des graphes de dépendance avec des formules et des scénarios.</p>
          </section>

          <section>
            <h2 className="text-zinc-200 font-semibold mb-2">3. Utilisation du service</h2>
            <p>Vous vous engagez à utiliser SmartGraph de manière légale et conforme aux présentes conditions. Toute utilisation abusive ou frauduleuse est interdite.</p>
          </section>

          <section>
            <h2 className="text-zinc-200 font-semibold mb-2">4. Données personnelles</h2>
            <p>Vos données sont stockées de manière sécurisée et ne sont pas partagées avec des tiers sans votre consentement. Vous pouvez demander la suppression de votre compte à tout moment.</p>
          </section>

          <section>
            <h2 className="text-zinc-200 font-semibold mb-2">5. Limitation de responsabilité</h2>
            <p>SmartGraph est fourni &quot;tel quel&quot;. Nous ne garantissons pas l&apos;exactitude des modèles générés par l&apos;IA et déclinons toute responsabilité pour les décisions prises sur leur base.</p>
          </section>

          <section>
            <h2 className="text-zinc-200 font-semibold mb-2">6. Contact</h2>
            <p>Pour toute question relative aux présentes conditions, contactez-nous via l&apos;application.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
