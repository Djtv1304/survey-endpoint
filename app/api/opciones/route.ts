import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { preguntaId, texto } = await req.json();

    if (!preguntaId || !texto) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const opcionRef = db.collection("Opcion").doc();
    await opcionRef.set({
      id: opcionRef.id,
      preguntaId,
      texto,
      votos: 0,
    });

    return NextResponse.json({ id: opcionRef.id, preguntaId, texto, votos: 0 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear la opción" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snapshot = await db.collection("Opcion").get();
    const opciones = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json(opciones);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener opciones" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { opcionId } = await req.json();

    if (!opcionId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const opcionRef = db.collection("opciones").doc(opcionId);
    const opcionDoc = await opcionRef.get();

    if (!opcionDoc.exists) {
      return NextResponse.json({ error: "Opción no encontrada" }, { status: 404 });
    }

    const votosActuales = opcionDoc.data()?.votos || 0;
    await opcionRef.update({ votos: votosActuales + 1 });

    return NextResponse.json({ success: true, opcionId, votos: votosActuales + 1 });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar votos" }, { status: 500 });
  }
}