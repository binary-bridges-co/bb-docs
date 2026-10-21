# Guía: configurar el certificado propio de su organización

Esta guía acompaña a los [Términos y condiciones del servicio](/legal/terminos).

Mientras su organización no configure un certificado propio, bb-sign sella los documentos firmados con un certificado de pruebas. Sirve para probar el servicio, pero los validadores lo muestran como no confiable. Siga esta guía para configurar el suyo.

## 1. Para qué sirve el certificado de la organización

El certificado sella cada documento firmado: garantiza que el documento no cambió después de firmarse y permite a un tercero confiar en quién lo selló. No es la firma digital de las personas que firman; ellas firman con el mecanismo de firma electrónica de bb-sign.

## 2. Qué comprar

- Un certificado a nombre de la organización (de persona jurídica o de función pública; el nombre comercial varía según la entidad), emitido por una Entidad de Certificación Digital que figure en el directorio del ONAC.
- Debe entregarse como **archivo PKCS#12 (.p12 o .pfx) con la llave privada exportable**. No sirve una llave en un token USB ni una llave que solo exista en la nube.
- Llave RSA de 2048 bits o más. Solo se admiten llaves RSA: bb-sign rechaza al cargar las de curva elíptica (EC), EdDSA y RSA-PSS.
- Uso de la llave "firma digital" y, de preferencia, "no repudio".

## 3. Exportar con la cadena completa

El archivo debe incluir el certificado de la organización, los certificados intermedios y la raíz.

- En Windows: `certmgr.msc`, seleccione el certificado, Exportar, indique que sí exporta la llave privada, formato PKCS#12 y marque "Incluir todos los certificados en la ruta de certificación si es posible".
- Con OpenSSL:

```
openssl pkcs12 -export -inkey clave.key -in certificado.crt -certfile cadena.pem -out organizacion.p12
```

Si bb-sign informa que el archivo o la contraseña no son válidos, vuelva a exportar con la opción `-legacy` de OpenSSL 3.

## 4. Verificar antes de subir

```
openssl pkcs12 -in organizacion.p12 -nokeys -info
```

Debe listar el certificado de la organización, el o los intermedios y la raíz.

## 5. Subir el certificado

Vaya a Configuración, pestaña Certificado, elija el archivo, escriba su contraseña y suba. bb-sign revisa el archivo y le informa el estado de la cadena:

- **Cadena completa:** el archivo incluye todos los certificados hasta la raíz. No hay nada más que hacer.
- **Sin raíz:** falta la raíz. Los validadores que ya confían en ella seguirán funcionando; si no, exporte de nuevo con la cadena completa.
- **Solo el certificado:** el archivo no incluye los certificados que emitieron el suyo. Vuelva a exportarlo con la ruta de certificación completa (sección 3).
- **Autofirmado:** el certificado se firmó a sí mismo y ningún tercero confiará en él.
- **El archivo incluye certificados que no emitieron el suyo:** sobran certificados de otra cadena. No impide subirlo, pero exporte de nuevo solo con la ruta de certificación de **este** certificado. Es distinto de "Solo el certificado": cada caso tiene su propia solución.

bb-sign rechaza el archivo cuando la cadena está rota (un certificado intermedio que no corresponde), cuando la llave privada no es la del certificado, cuando falta la llave privada, cuando hay más de una llave privada o cuando algún certificado está vencido.

## 6. Renovación

Suba el certificado renovado antes de que venza el actual. El cambio puede tardar hasta 5 minutos en aplicarse a los sellos nuevos.

bb-sign envía un correo a los administradores de la organización 30 días y 7 días antes de que venza el certificado propio, con la fecha de vencimiento y un enlace a Configuración → Certificado. Los avisos son una ayuda: la renovación sigue siendo responsabilidad de la organización.

## 7. Comprobar un PDF sellado

Abra el PDF firmado en Adobe Acrobat y revise el panel de firmas. Si importó la raíz de su entidad de certificación como confiable, verá la ruta completa y que la identidad es válida.

## 8. Seguridad

Nunca envíe el archivo .p12 ni su contraseña por correo electrónico.
