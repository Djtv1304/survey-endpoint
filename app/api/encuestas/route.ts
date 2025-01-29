import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { titulo, descripcion, creadorId } = await req.json();
    const codigoAcceso = uuidv4().slice(0, 6); // Código único de acceso

    const encuestaRef = db.collection("encuestas").doc();
    await encuestaRef.set({
      id: encuestaRef.id,
      titulo,
      descripcion,
      codigoAcceso,
      creadorId,
      participantes: 0,
      fechaCreacion: new Date(),
    });

    return NextResponse.json({ id: encuestaRef.id, titulo, codigoAcceso });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear la encuesta" }, { status: 500 });
  }
}