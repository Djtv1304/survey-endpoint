import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
interface Opcion {
  id: string;
  preguntaId: string;
  texto: string;
  votos: number;
}

export interface QuestionType {
  id: string;
  encuestaId: string;
  titulo: string;
  opciones: Opcion[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encuestaId = searchParams.get("encuestaId");

  if (!encuestaId) {
    return new Response("Encuesta ID es requerido", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      console.log("Conexión SSE iniciada para encuestaId:", encuestaId);

      // Realizamos la consulta de las preguntas solo una vez al inicio
      const preguntasRef = db.collection("Pregunta").where("encuestaId", "==", encuestaId);
      
      preguntasRef.get()
        .then(snapshot => {
          const preguntas = snapshot.docs.map(doc => doc.data());

          // Realizamos un loop solo cuando obtenemos las preguntas, sin iterar innecesariamente
          const opcionRef = db.collection("Opcion").where("preguntaId", "in", preguntas.map(p => p.id));

          // Ahora escuchamos la colección "Opcion" para cualquier cambio en los votos
          const unsubscribeOpciones = opcionRef.onSnapshot((snapshotOpciones) => {
            const preguntasConOpciones = preguntas.map((pregunta) => {
              // Asociar las opciones con sus respectivas preguntas
              const opciones = snapshotOpciones.docs
                .filter(doc => doc.data().preguntaId === pregunta.id)
                .map(doc => doc.data());

              return { ...pregunta, opciones };
            });

            // Enviar los datos al frontend
            if (preguntasConOpciones.length) {
              controller.enqueue(`data: ${JSON.stringify(preguntasConOpciones)}\n\n`);
            }
          });

          req.signal.addEventListener("abort", () => {
            console.log("SSE connection closed");
            unsubscribeOpciones(); // Unsubscribe from changes
            controller.close();
          });
        })
        .catch(error => {
          console.error("Error al obtener las preguntas:", error);
          controller.enqueue(`data: ${JSON.stringify({ error: "Error al obtener preguntas" })}\n\n`);
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
    return NextResponse.json(
      { error: "Error al actualizar los votos" },
      { status: 500 }
    );
  }
}