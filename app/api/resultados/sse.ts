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
      // Recoger las opciones de una pregunta en tiempo real
      const encuestaRef = db.collection("Opcion").where("preguntaId", "==", encuestaId);

      // Escuchar cambios en la base de datos y crear un JSON con los datos
      const unsubscribe = encuestaRef.onSnapshot((snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data());
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      });

      // Cerrar el stream si la conexión se cierra
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