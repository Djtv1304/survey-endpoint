import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { encuestaId, titulo } = await req.json();

    if (!encuestaId || !titulo) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const preguntaRef = db.collection("preguntas").doc();
    await preguntaRef.set({
      id: preguntaRef.id,
      encuestaId,
      titulo,
    });

    return NextResponse.json({ id: preguntaRef.id, encuestaId, titulo });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear la pregunta" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snapshot = await db.collection("preguntas").get();
    const preguntas = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json(preguntas);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener preguntas" }, { status: 500 });
  }
}