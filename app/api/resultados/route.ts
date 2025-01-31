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
      console.log("Conexión SSE iniciada para encuestaId:", encuestaId);

      // Primero, buscar las preguntas de la encuesta
      const preguntaRef = db.collection("Pregunta").where("encuestaId", "==", encuestaId);

      // Escuchar cambios en la colección "Pregunta" para obtener las preguntas asociadas a la encuesta
      const unsubscribe = preguntaRef.onSnapshot(async (snapshot) => {
        const preguntas = snapshot.docs.map((doc) => doc.data());

        // Ahora tenemos las preguntas, buscamos sus opciones
        const preguntasConOpciones = await Promise.all(preguntas.map(async (pregunta) => {
          const preguntaId = pregunta.id;

          // Ahora buscamos las opciones de esta pregunta
          const opcionesRef = db.collection("Opcion").where("preguntaId", "==", preguntaId);
          const opcionesSnapshot = await opcionesRef.get();
          const opciones = opcionesSnapshot.docs.map((doc) => doc.data());

          // Agregamos las opciones a la pregunta
          return { ...pregunta, opciones };
        }));

        // Enviar las preguntas y opciones actualizadas al cliente
        controller.enqueue(`data: ${JSON.stringify(preguntasConOpciones)}\n\n`);

        // Ahora que tenemos las preguntas y sus opciones, podemos escuchar cambios en las opciones (votos)
        // Escuchar la colección "Opcion" para detectar cambios en los votos
        const opcionRef = db.collection("Opcion").where("preguntaId", "in", preguntas.map(p => p.id));
        const unsubscribeOpciones = opcionRef.onSnapshot(async (snapshot) => {
          // Cuando hay cambios en los votos, obtenemos nuevamente las preguntas y sus opciones
          const preguntasConOpcionesActualizadas = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const opcion = doc.data();
              const preguntaRef = db.collection("Pregunta").doc(opcion.preguntaId);
              const preguntaDoc = await preguntaRef.get();
              const pregunta = preguntaDoc.data();

              // Obtener opciones relacionadas con la pregunta
              const opcionesRef = db.collection("Opcion").where("preguntaId", "==", opcion.preguntaId);
              const opcionesSnapshot = await opcionesRef.get();
              const opciones = opcionesSnapshot.docs.map((opcionDoc) => opcionDoc.data());

              // Agregar opciones a la pregunta
              return { ...pregunta, opciones };
            })
          );

          // Emitir las preguntas actualizadas con sus opciones y los votos recientes
          controller.enqueue(`data: ${JSON.stringify(preguntasConOpcionesActualizadas)}\n\n`);
        });

        // Cerrar el stream si la conexión se cierra
        req.signal.addEventListener("abort", () => {
          console.log("SSE connection closed");
          unsubscribe();
          unsubscribeOpciones();
          controller.close();
        });
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