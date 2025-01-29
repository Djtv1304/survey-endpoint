import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const usuariosRef = db.collection("Usuario");
    const snapshot = await usuariosRef.where("email", "==", email).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const user = snapshot.docs[0].data();
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // Dentro del token se guarda el id del usuario y su email
    const token = jwt.sign({ id: snapshot.docs[0].id, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });

    return NextResponse.json({ token, user: { id: snapshot.docs[0].id, nombre: user.nombre, email: user.email } });
  } catch (error) {
    return NextResponse.json({ error: "Error en el login" }, { status: 500 });
  }
}