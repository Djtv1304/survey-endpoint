import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { encuestaId, titulo } = await req.json();

    if (!encuestaId || !titulo) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const preguntaRef = db.collection("Pregunta").doc();
    await preguntaRef.set({
      id: preguntaRef.id,
      encuestaId,
      titulo,
    });

    return NextResponse.json({ id: preguntaRef.id, encuestaId, titulo });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al crear la pregunta" },
      { status: 500 }
    );
  }
}

// Path: app/api/preguntas/route.ts - Metodo para conseguir todas las preguntas de una encuesta en base a su ID
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const encuestaId = searchParams.get("encuestaId");

    if (!encuestaId) {
      return NextResponse.json(
        { error: "Falta el parámetro encuestaId" },
        { status: 400 }
      );
    }

    const snapshot = await db
      .collection("Pregunta")
      .where("encuestaId", "==", encuestaId)
      .get();
    const preguntas = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json(preguntas);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener preguntas" },
      { status: 500 }
    );
  }
}
