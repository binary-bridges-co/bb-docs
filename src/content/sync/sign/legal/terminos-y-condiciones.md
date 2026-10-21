# Términos y condiciones del servicio bb-sign

**Versión 4** · 2026-10-20

Estos términos hacen parte del contrato de prestación de servicios suscrito entre Binary Bridges S.A.S. y cada cliente. Se publican en la aplicación para consulta; no requieren aceptación en línea. Cada cambio incrementa la versión y queda en el historial al final del documento.

## 1. Naturaleza del servicio

**1.1** bb-sign ofrece un mecanismo de firma electrónica en los términos del Decreto 2364 de 2012 (compilado en el Decreto 1074 de 2015). No es firma digital en los términos del artículo 28 de la Ley 527 de 1999.

**1.2** Cada cliente, por medio de su oficina jurídica, decide si el mecanismo es apropiado para los documentos que envía a firma.

## 2. Certificado de sello

**2.1** Al completarse un sobre, bb-sign sella cada documento firmado con un certificado digital; cualquier alteración posterior del documento es detectable.

**2.2** Mientras el cliente no configure un certificado propio, bb-sign sella con un **certificado de pruebas** de Binary Bridges. Es autofirmado, no otorga confianza ante terceros, y los validadores (por ejemplo Adobe Acrobat o el validador de la Comisión Europea) lo mostrarán como no confiable.

**2.3** Es responsabilidad del cliente obtener un certificado emitido por una Entidad de Certificación Digital acreditada por el ONAC, configurarlo en bb-sign con su cadena de certificación completa y renovarlo antes de su vencimiento. La guía para hacerlo está en [Guía de certificado propio](/guias/certificado-propio).

**2.4** bb-sign envía avisos por correo a los administradores de la organización 30 y 7 días antes del vencimiento del certificado propio. Estos avisos son una ayuda; no trasladan a Binary Bridges la responsabilidad de la renovación.

**2.5** La falta de un certificado propio no impide enviar sobres; en ese caso los documentos se sellan con el certificado de pruebas.

**2.6** bb-sign guarda el archivo del certificado y su contraseña cifrados, y los usa para sellar los documentos de esa organización y la evidencia que bb-sign genera para ellos, y para ningún otro fin.

## 3. Conservación de documentos y evidencias

**3.1 Plazo fijo.** bb-sign conserva los documentos originales, los documentos firmados y las evidencias de cada sobre durante un plazo fijo de trescientos sesenta y cinco (365) días, contados desde que cada archivo se carga o se genera. El plazo no es configurable. Al cumplirse, el archivo deja de estar disponible y se borra de forma definitiva de nuestro almacenamiento en los días siguientes; después no se puede recuperar.

**3.2 Archivo después de 90 días.** Los documentos con más de noventa (90) días pueden trasladarse a almacenamiento de archivo; en ese caso **no se pueden descargar de inmediato**. Un usuario autorizado de la organización (en la aplicación o por la API) puede solicitar su restauración, y el firmante, desde su enlace, la de su copia firmada. Cuando el archivo está disponible, bb-sign envía un correo a las personas que lo solicitaron y, a las integraciones suscritas, el webhook `document.restored`; normalmente tarda unas horas, sin un tiempo garantizado. La copia restaurada permanece disponible durante siete (7) días. El certificado de evidencias y el registro de auditoría no se archivan y se pueden descargar de inmediato durante los 365 días.

**3.3 Conservación a cargo del cliente.** La conservación después de los 365 días, conforme al artículo 12 de la Ley 527 de 1999 y a las normas de conservación propias del cliente, es responsabilidad del cliente. Recomendamos archivar cada sobre en los sistemas del cliente en cuanto se complete, usando el webhook `envelope.completed` y la API de descarga. La [Guía de conservación y restauración de documentos](/guias/conservacion-y-restauracion) explica cómo.

## Historial de versiones

- Versión 1 (2026-10-07): secciones 1 y 2.
- Versión 2 (2026-10-19): sección 3, conservación de documentos y evidencias.
- Versión 3 (2026-10-19): avisos de vencimiento del certificado (2.4); las cláusulas 2.4 y 2.5 pasan a ser 2.5 y 2.6.
- Versión 4 (2026-10-20): publicación final; las cláusulas no cambian.
