# Recomendación de hosting y web de lanzamiento

## Conclusión ejecutiva

Para **CompraInteligente**, el plan **Hosting Pro** es suficiente para una web pública sencilla con dominio, HTTPS y una página que presente la aplicación y dirija a Google Play. Sin embargo, ese hosting compartido no debe considerarse automáticamente apto para el backend: el sistema de precios, comercios, base de datos y actualización diaria de SEPA necesita un proceso servidor, tareas programadas y controles de seguridad.

De los planes de la imagen, el único candidato para ejecutar ese backend es el **Virtual VPS**, porque ofrece sistema operativo Linux, acceso root, IP propia y disco desde 50 GB. Antes de contratarlo, se debe pedir por escrito la configuración de CPU, RAM, transferencia mensual, tipo de disco, copias de seguridad, soporte de Docker/Node.js, puertos disponibles, firewall y garantía de disponibilidad. Sin esos datos no es responsable confirmar una compra.

> Esta es una recomendación técnica, no una garantía comercial. El precio, la capacidad real y las condiciones del proveedor deben confirmarse antes de contratar.

## Comparación de los planes mostrados

| Plan | Uso adecuado | No usarlo para | Veredicto |
|---|---|---|---|
| Hosting Mini o Mediano | Página informativa muy simple o correo básico. | API de la aplicación, importación SEPA, base de precios o portal de comercios. | No recomendado. |
| Hosting Pro | Landing web, dominio, HTTPS, formulario de contacto y enlace a Google Play. | Backend Node/Express persistente, importador diario o servicios con procesos de fondo, salvo confirmación expresa del proveedor. | Recomendado para la web pública. |
| Hosting Mega | Web con más contenido, correo y WordPress. | Backend de precios: tener más espacio y bases de datos no sustituye un servidor con tareas programadas y runtime propio. | Solo si la web crecerá mucho. |
| Virtual VPS | API, base de datos, importador SEPA, panel de comercios, cron diario y mapa/listado propio. | No es necesario para una landing aislada. | Recomendado para el backend, si cumple requisitos mínimos. |
| Plan Streaming | Audio en directo. | Toda función de CompraInteligente. | No corresponde. |

## Arquitectura inicial recomendada

La opción más clara es separar responsabilidades. El **Hosting Pro** aloja la web institucional en `compraintelegente.com.ar`; el **VPS** aloja la API y la base de datos en `api.compainteligente.com.ar`. Un trabajo programado ejecuta la actualización SEPA; el portal de comercios se conecta a la misma API. La aplicación Android y la web consumen esa API mediante HTTPS.

Para comenzar con pocos comercios y una sola ciudad, el VPS debería disponer como mínimo de **2 vCPU, 4 GB de RAM, 50 GB SSD/NVMe, copias de seguridad diarias, 1 TB de transferencia mensual, Ubuntu LTS, firewall, SSL y monitoreo**. Si el proveedor no confirma estos mínimos, es preferible contratar una alternativa gestionada para la API y base de datos antes que un VPS insuficiente.

## Web de descarga hacia Google Play

La página puede ser estática y no requiere un servidor complejo. Debe incluir la propuesta de valor, capturas reales de la aplicación, explicación de privacidad y ubicación, contacto, política de privacidad, y un botón visible **“Descargar en Google Play”**. El botón debe apuntar a la ficha pública de Play Store cuando el identificador de la aplicación esté disponible. Antes de publicar en Play, puede mostrar **“Próximamente”** o permitir registro de interés; no debe redirigir a un enlace inexistente.

La misma web puede detectar Android y resaltar el botón de Google Play; en escritorio debe mostrar un código QR y el enlace para abrirlo desde el teléfono. También conviene usarla como página oficial vinculada desde el Perfil de Negocio de Google y desde las redes del proyecto.

## Pasos de decisión

Primero, solicitar al proveedor la ficha técnica completa del VPS y confirmar que permite Ubuntu, Node.js/Docker, una base de datos y tareas cron. Segundo, registrar un dominio y contratar Hosting Pro únicamente para la landing si incluye SSL y el dominio se puede apuntar a DNS propio. Tercero, preparar la web con el enlace de Play Store, las políticas de privacidad y el formulario de contacto. Por último, migrar el backend de precios y comercios al VPS sólo cuando la importación SEPA y el portal estén listos para pruebas.
