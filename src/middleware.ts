export { default } from "next-auth/middleware";

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/admin/:path*",     // opcional, já deixa preparado para futuras rotas
    ],
};
