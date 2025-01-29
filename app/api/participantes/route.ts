import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, encuestaId } = await req.json();

    if (!nombre || !apellido || !encuestaId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const participanteRef = db.collection("Participante").doc();
    await participanteRef.set({
      id: participanteRef.id,
      nombre,
      apellido,
      encuestaId,
    });

    // Actualizar el contador de participantes en la encuesta
    const encuestaRef = db.collection("Encuesta").doc(encuestaId);
    const encuestaDoc = await encuestaRef.get();

    if (encuestaDoc.exists) {
      const participantesActuales = encuestaDoc.data()?.participantes || 0;
      await encuestaRef.update({ participantes: participantesActuales + 1 });
    }

    return NextResponse.json({ id: participanteRef.id, nombre, apellido, encuestaId });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar participante" }, { status: 500 });
  }
}