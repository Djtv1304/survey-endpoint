import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

// Manejo de la conexión SSE para escuchar los resultados en tiempo real
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encuestaId = searchParams.get("encuestaId");

  if (!encuestaId) {
    return new Response("Encuesta ID es requerido", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Primero, buscar las preguntas de la encuesta
      const preguntaRef = db.collection("Pregunta").where("encuestaId", "==", encuestaId);

      // Escuchar cambios en la colección "Pregunta" para obtener las preguntas asociadas a la encuesta
      const unsubscribe = preguntaRef.onSnapshot(async (snapshot) => {
        const preguntas = snapshot.docs.map((doc) => doc.data());
        
        // Buscar las opciones correspondientes a cada pregunta
        for (let pregunta of preguntas) {
          const preguntaId = pregunta.id;

          // Ahora buscamos las opciones de esta pregunta
          const opcionesRef = db.collection("Opcion").where("preguntaId", "==", preguntaId);
          
          const opcionesSnapshot = await opcionesRef.get();
          const opciones = opcionesSnapshot.docs.map((doc) => doc.data());

          // Crear el objeto con la pregunta y sus opciones
          pregunta = {
            ...pregunta,
            opciones: opciones,
          };
        }

        // Enviar las preguntas y opciones actualizadas al cliente
        controller.enqueue(`data: ${JSON.stringify(preguntas)}\n\n`);
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

// Endpoint para actualizar los votos, solo se recibirá el voto actual
export async function POST(req: NextRequest) {
  try {
    const { encuestaId, preguntaId, optionId } = await req.json();

    if (!encuestaId || !preguntaId || !optionId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Obtener la referencia a la opción seleccionada
    const opcionRef = db.collection("Opcion").doc(optionId);

    // Actualizar el voto sumando 1
    await opcionRef.update({
      votos: FieldValue.increment(1), // Incrementa el voto
    });

    // Enviar una respuesta exitosa
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar los votos" }, { status: 500 });
  }
}