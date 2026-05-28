import { verifySUSToken }  from "@/lib/ux/sus-token";
import { prisma }          from "@/lib/prisma";
import { SUSClient }       from "./SUSClient";

interface Props { params: { token: string } }

export const metadata = { title: "Evalvacija uporabnosti — Magicflow" };

export default async function SUSPage({ params }: Props) {
  const { token } = params;

  // Preveri JWT
  const verified = verifySUSToken(decodeURIComponent(token));

  if (!verified.ok) {
    return <ErrorScreen reason={verified.reason} />;
  }

  // Preveri DB
  const session = await prisma.sUSStudySession.findUnique({
    where:   { id: verified.payload.sub },
    include: { response: { select: { id: true } } },
  });

  if (!session) {
    return <ErrorScreen reason="invalid" />;
  }

  if (session.used || session.response) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-6">✓</div>
          <h1 className="text-2xl font-bold text-white mb-3">Vprašalnik je bil že izpolnjen</h1>
          <p className="text-white/50">Ta povezava je enkratna in je bila že uporabljena. Hvala za sodelovanje!</p>
        </div>
      </div>
    );
  }

  return <SUSClient token={token} sessionLabel={session.label} />;
}

function ErrorScreen({ reason }: { reason: string }) {
  const msg = reason === "expired"
    ? "Povabilo je poteklo. Prosite vodjo študije za novo."
    : "Neveljavna ali poškodovana povezava.";

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">⚠️</div>
        <h1 className="text-xl font-semibold text-white mb-3">Dostop ni mogoč</h1>
        <p className="text-white/50 text-sm">{msg}</p>
      </div>
    </div>
  );
}
