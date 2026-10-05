export async function generarKey(secret:string): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        "raw",                              //formato de entrada secuencia de bits sin codificar
        new TextEncoder().encode(secret),   //vonvierte la clave  en un UintBarry entendible
        {name: "HMAC", hash: "SHA-256"},    //define el algoritmo para HMAC crea una clave con formato SHA-256
        false,                              // se define la clave puede ser importada despues de creada
        ["sign", "verify"]                 //define para que puede ser usada la clave sing = firmar datos verify = verificar firma
    )
    
}