import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/auth/register");
    const { nombre, apellido, email, password } = await req.json();
    
    const usuariosRef = db.collection("Usuario");
    const userExists = await usuariosRef.where("email", "==", email).get();

    if (!userExists.empty) {
      return NextResponse.json({ error: "El usuario ya existe" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userDoc = await usuariosRef.add({ nombre, apellido, email, password: hashedPassword });

    return NextResponse.json({ id: userDoc.id, nombre, apellido, email });
  } catch (error) {
    return NextResponse.json(
      { error: "Error en el registro" + (error as Error).message },
      { status: 500 },
    );
  }
}