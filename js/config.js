/* =========================================================
   CONFIGURACIÓN · lo único que hay que tocar al instalar
   ---------------------------------------------------------
   Los dos primeros valores salen de Supabase:
     Project Settings ▸ API Keys (o «Data API»)
       · Project URL            → SUPABASE_URL
       · Publishable key / anon → SUPABASE_CLAVE

   Esa clave es PÚBLICA a propósito: va en todas las webs hechas
   con Supabase. Lo que protege los datos son las reglas (RLS) de
   supabase/esquema.sql, no el secreto de esta clave.

   ⚠ NUNCA pongas aquí la «secret key» ni la «service_role»:
     esas sí saltan todas las reglas.
   ========================================================= */
window.CONFIG = {
  SUPABASE_URL: 'https://bfigyrzzjcntjlyeusqd.supabase.co',
  SUPABASE_CLAVE: 'sb_publishable_pEZpOTlYFRZqP-n4sZNxKw_8v-rieSp',

  /* Dominio ficticio de los «correos» internos: al entrar se escribe
     solo el usuario («dani») y la web lo convierte en
     «dani@usuarios.classmojo.invalid». Al crear la cuenta en Supabase
     hay que usar ese mismo correo (ver supabase/GUIA-SUPABASE.md). */
  DOMINIO_USUARIOS: 'usuarios.classmojo.invalid'
};
