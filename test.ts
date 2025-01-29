import { db } from "./app/lib/firebase";

async function testFirestore() {
  try {
    const snapshot = await db.collection("Usuario").get();
    console.log("📡 Firestore conectado: ", snapshot.size, "usuarios encontrados.");
  } catch (error) {
    console.error("❌ Error conectando a Firestore: ", error);
  }
}

testFirestore();
