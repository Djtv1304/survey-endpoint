import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token no proporcionado" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1]; // Extraer el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    if (!decoded.id) {
      return NextResponse.json({ error: "Token inválido" }, { status: 403 });
    }

    const { titulo, descripcion } = await req.json();
    const codigoAcceso = uuidv4().slice(0, 6); // Código único de acceso

    const encuestaRef = db.collection("Encuesta").doc();
    await encuestaRef.set({
      id: encuestaRef.id,
      titulo,
      descripcion,
      codigoAcceso,
      creadorId: decoded.id, // Extraído desde el token
      participantes: 0,
      fechaCreacion: new Date(),
    });

    return NextResponse.json({ id: encuestaRef.id, titulo, codigoAcceso });
  } catch (error) {
    console.error("❌ Error al crear encuesta:", error);
    return NextResponse.json({ error: "Error al crear la encuesta" }, { status: 500 });
  }
}