import { NextRequest } from "next/server";
import { db } from "@/app/lib/firebase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encuestaId = searchParams.get("encuestaId");

  if (!encuestaId) {
    return new Response("Encuesta ID es requerido", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encuestaRef = db.collection("opciones").where("preguntaId", "==", encuestaId);

      const unsubscribe = encuestaRef.onSnapshot((snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data());
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}