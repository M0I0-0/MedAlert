# PROYECTO TEMA IV - SCRUM

## MedAlert - Recordatorio de Medicamentos con Módulo de Interacciones y Telemedicina

**Nombre del sistema:** MedAlert  
**Tipo de proyecto:** Aplicación web responsive para gestión de recordatorios médicos  
**Metodología aplicada:** Scrum  
**Integrantes:** ________________________________________________  
**Docente:** ________________________________________________  
**Grupo:** ________________________________________________  
**Fecha:** ____ / ____ / ______

---

# 1. Portada

## Nombre del Proyecto

**PROYECTO TEMA IV - SCRUM**

## Nombre del Sistema

**MedAlert - Recordatorio de Medicamentos con Módulo de Interacciones y Telemedicina**

## Breve Descripción

MedAlert es una aplicación web responsive orientada al seguimiento de tratamientos médicos. Su propósito es apoyar a pacientes, médicos, cuidadores y farmacéuticos mediante recordatorios de medicamentos, registro de tomas, control de horarios, revisión de interacciones, seguimiento remoto por el médico y visualización de indicadores de adherencia al tratamiento.

El sistema contempla funcionalidades de autenticación, perfiles por rol, prescripciones digitales, registro de medicamentos, horarios complejos, notificaciones simuladas por SMS, vista familiar, modo farmacéutico, modo hospitalario y dashboards de seguimiento.

---

# 2. Introducción

## Objetivo del Documento

El objetivo de este documento es presentar un análisis formal y detallado del sistema MedAlert desde el enfoque de la metodología Scrum. Se describe el alcance funcional del proyecto, el estado actual del sistema desarrollado, las funcionalidades implementadas, las funcionalidades pendientes, la planeación por sprints, el Product Backlog, los Sprint Backlogs, la definición de terminado y los principales riesgos del proyecto.

El documento también compara el sistema actual contra los requerimientos establecidos para el proyecto, identificando qué módulos están completos, cuáles se encuentran en proceso y cuáles deben completarse durante el último sprint.

## Descripción Breve de MedAlert

MedAlert es una aplicación web responsive diseñada para pacientes que necesitan apoyo en la administración de medicamentos. Permite registrar tratamientos, dosis, horarios, frecuencia de toma, recordatorios, cumplimiento, omisiones, notas médicas, interacciones entre medicamentos y seguimiento por familiares o cuidadores.

El sistema está pensado para ser utilizado por diferentes tipos de usuarios:

- Pacientes.
- Médicos.
- Familiares o cuidadores.
- Farmacéuticos.
- Administradores.

## Justificación del Uso de Scrum

Scrum es adecuado para MedAlert porque el proyecto contiene múltiples módulos que pueden desarrollarse de forma incremental. El sistema no depende de una sola entrega final, sino de avances funcionales que pueden validarse progresivamente, como autenticación, gestión de medicamentos, registro de tomas, notificaciones, dashboards y reportes.

Scrum permite:

1. Dividir el trabajo en sprints con objetivos claros.
2. Priorizar las funcionalidades de mayor valor para el usuario.
3. Revisar avances al final de cada sprint.
4. Adaptar el alcance conforme se detectan pendientes o mejoras.
5. Entregar incrementos funcionales del sistema.

Para este proyecto se definen exactamente tres sprints:

1. **Sprint 1:** Autenticación, login y estructura base.
2. **Sprint 2:** Gestión de medicamentos, horarios y registro de tomas.
3. **Sprint 3:** Funcionalidades pendientes, reportes, telemedicina e integraciones.

---

# 3. Descripción General del Sistema

## Qué Hace MedAlert

MedAlert permite administrar tratamientos médicos desde una plataforma web responsive. El sistema ayuda a que el paciente recuerde sus medicamentos, registre si tomó o no una dosis y permita que un médico o familiar supervise la adherencia al tratamiento.

Las funciones principales son:

- Inicio de sesión por rol.
- Registro de usuarios.
- Recuperación de contraseña.
- Gestión de pacientes.
- Gestión de medicamentos y prescripciones.
- Registro de dosis, frecuencia y horarios.
- Generación de tomas programadas.
- Marcado de tomas cumplidas o no cumplidas.
- Registro de motivos de omisión.
- Validación de interacciones medicamentosas.
- Consulta de adherencia.
- Vista familiar.
- Vista médica.
- Vista farmacéutica.
- Notificaciones simuladas por SMS.
- Historial de cambios en prescripciones.
- Alertas de bajo stock.
- Modo hospitalario para registro de tomas en lote.

## Tipos de Usuarios

### Paciente

El paciente es el usuario que recibe los tratamientos médicos. Puede consultar sus medicamentos activos, revisar indicaciones, marcar tomas como cumplidas o no cumplidas, registrar observaciones, consultar su historial de tomas y confirmar lectura de notificaciones.

### Cuidador o Familiar

El cuidador o familiar puede consultar un resumen del paciente vinculado. Su función es apoyar en el seguimiento del tratamiento, revisar adherencia, omisiones, próxima toma, notas médicas y alertas automáticas cuando la adherencia es baja.

### Médico

El médico puede visualizar sus pacientes, crear prescripciones digitales, modificar dosis, desactivar tratamientos, consultar recetas activas, dejar notas remotas y registrar tomas hospitalarias en lote. También puede consultar historial de versiones y alertas de recarga.

### Farmacéutico

El farmacéutico administra el catálogo de medicamentos, consulta prescripciones activas, dispensa medicamentos y sugiere equivalencias o genéricos con base en el principio activo.

### Administrador

El administrador representa el rol de mayor control del sistema. La base de datos contempla este rol y la autenticación lo reconoce. Su función esperada es dar de alta usuarios, controlar permisos y supervisar el sistema. Actualmente este módulo existe de forma parcial y requiere una interfaz administrativa completa.

## Flujo General del Sistema

1. El usuario accede a la pantalla de inicio de sesión.
2. Selecciona su rol e introduce correo y contraseña.
3. El backend valida credenciales y genera tokens JWT.
4. Según el rol, el usuario es redirigido a su interfaz correspondiente.
5. El médico consulta pacientes y crea prescripciones.
6. El sistema valida interacciones entre medicamentos.
7. Al crear una prescripción, se generan tomas programadas según frecuencia y duración.
8. El paciente consulta sus medicamentos y marca tomas.
9. El sistema registra hora programada, hora real, retraso o adelanto.
10. El familiar consulta el resumen y recibe alertas si la adherencia baja del 70%.
11. El farmacéutico consulta recetas, dispensa medicamentos y administra el catálogo.
12. El scheduler de notificaciones genera y simula avisos SMS.
13. El sistema guarda historial de cambios y muestra alertas de stock bajo.
14. Los reportes avanzados y exportaciones quedan pendientes para Sprint 3.

---

# 4. Alcance del Proyecto

## Funcionalidades Incluidas

El sistema incluye actualmente:

- Autenticación por correo, contraseña y rol.
- JWT access token y refresh token.
- Sesión activa única.
- Registro público de usuarios no administradores.
- Recuperación de contraseña mediante token por correo o enlace temporal.
- Interfaces por rol.
- Catálogo de medicamentos.
- CRUD real del catálogo farmacéutico.
- Prescripciones médicas.
- Relación médico-paciente.
- Validación para que solo el médico asignado modifique tratamientos.
- Generación de horarios y tomas.
- Registro de tomas cumplidas o no cumplidas.
- Motivo de omisión.
- Observaciones y efectos adversos como texto.
- Historial de versiones de prescripción.
- Base local de 20 interacciones comunes.
- Dashboard médico básico.
- Vista familiar con adherencia y alertas.
- Vista farmacéutica con equivalencias.
- Notificaciones SMS simuladas con logs.
- Confirmación de lectura.
- Alertas de recarga por stock bajo.
- Modo hospitalario de tomas en lote.

## Funcionalidades Prioritarias

Las funcionalidades prioritarias son:

1. Autenticación segura.
2. Gestión de usuarios por rol.
3. Prescripción de medicamentos.
4. Horarios y recordatorios.
5. Registro de tomas.
6. Validación de interacciones.
7. Seguimiento de adherencia.
8. Notificaciones.
9. Vista familiar y médica.
10. Reportes exportables.

## Pendientes o Mejoras Futuras

Las principales funcionalidades pendientes o mejorables son:

- Verificación real por correo o SMS al registrarse.
- Preguntas de seguridad para recuperación de contraseña.
- Doble factor opcional.
- Dashboard administrativo.
- Exportación de reportes a PDF y Excel.
- Firma digital de reportes con hash y timestamp.
- Tendencia mensual.
- Reportes interactivos más completos.
- Dropdown formal para efectos adversos.
- Omisiones justificadas como porcentaje en dashboard médico.
- Notificaciones push o correo reales.
- Integración real con Twilio u otro proveedor SMS.

---

# 5. Análisis del Sistema Actual

El sistema actual tiene un avance considerable en autenticación, roles, interfaces, medicamentos, prescripciones, tomas, notificaciones simuladas, historial y stock. El Sprint 1 fue trabajado principalmente en login, registro, recuperación de contraseña, perfiles básicos e interfaces iniciales por rol. Posteriormente se integraron funcionalidades centrales para medicamentos, tomas y dashboards.

## Funcionalidades Implementadas o Avanzadas

- Login por rol.
- Registro por rol.
- Recuperación de contraseña con token.
- Cierre de sesión.
- Persistencia de sesión mediante localStorage y JWT.
- Middleware de autenticación.
- Middleware de autorización por rol.
- Interfaces iniciales responsive.
- Vista de paciente.
- Vista de médico.
- Vista de familiar.
- Vista de farmacéutico.
- Catálogo de medicamentos.
- CRUD farmacéutico del catálogo.
- Prescripciones digitales.
- Generación automática de tomas.
- Marcado de tomas.
- Alertas por baja adherencia en familiar.
- Interacciones medicamentosas.
- Notificaciones SMS simuladas.
- Confirmación de lectura.
- Modo hospitalario.
- Alertas de bajo stock.

## Tabla de Análisis Actual

| Funcionalidad | Estado actual | Observaciones | Pendiente o mejora |
|---|---|---|---|
| Login por rol | Hecho | Permite ingresar como paciente, médico, familiar, farmacéutico o administrador. | Mejorar mensajes de error y auditoría de accesos. |
| Registro de usuario | En proceso | Permite registrar usuarios no administradores. | Falta verificación real por correo o SMS. |
| Recuperación de contraseña | En proceso | Usa token y correo si SMTP está configurado. | Falta recuperación con preguntas de seguridad. |
| JWT refresh token | Hecho | Access token de 5 minutos y refresh token de 7 días. | Reforzar configuración de secretos en producción. |
| Sesión activa única | Hecho | Invalida tokens anteriores del mismo usuario. | Agregar vista para cerrar sesiones activas. |
| Interfaces por rol | Hecho | Existen pantallas para médico, paciente, familiar y farmacéutico. | Falta dashboard administrador completo. |
| Perfil médico | En proceso | BD contiene cédula y especialidad; dashboard muestra datos. | `PerfilDoctor.html` aún es estático. |
| CRUD catálogo farmacéutico | Hecho | Farmacéutico puede crear, editar y eliminar medicamentos si no están en uso. | Agregar filtros y paginación. |
| Prescripciones médicas | Hecho | Médico crea, edita y desactiva tratamientos. | Mejorar vista formal de receta digital. |
| Relación médico-paciente | Hecho | Solo médico asignado puede modificar tratamientos. | Agregar reasignación controlada por administrador. |
| Historial de cambios | Hecho | Guarda cambios de prescripción y permite consultarlos. | Mostrar diferencias más detalladas campo por campo. |
| Interacciones medicamentosas | Hecho | Base local de 20 interacciones. | Ampliar base y permitir mantenimiento por admin/farmacéutico. |
| Horarios complejos | En proceso | Maneja cada 8h, cada 12h, fines de semana, días alternos y comidas. | Ampliar reglas personalizadas. |
| Dosis por peso/edad | En proceso | Cálculo básico en frontend médico. | Falta fórmula clínica configurable. |
| Stock estimado | Hecho | Se guarda en prescripción y se alerta si es bajo. | Descontar stock automáticamente al marcar tomas. |
| Registro de tomas | Hecho | Paciente registra cumplido/no cumplido. | Convertir efectos adversos en dropdown formal. |
| Modo hospitalario | Hecho | Médico registra tomas en lote como enfermería. | Agregar rol específico de enfermero. |
| Notificaciones SMS simuladas | Hecho | Scheduler genera y registra logs SMS. | Integrar proveedor real si se requiere. |
| Confirmación de lectura | Hecho | Paciente puede confirmar lectura. | Mostrar métricas de lectura en dashboard médico. |
| Vista familiar | Hecho | Muestra resumen, adherencia, alertas y notas. | Agregar selección de múltiples pacientes. |
| Reportes PDF/Excel | Pendiente | No implementado. | Sprint 3. |
| Tendencia mensual | Pendiente | No implementada. | Sprint 3. |
| Firma digital de reportes | Pendiente | No implementada. | Sprint 3. |

---

# 6. Product Backlog

| ID | Historia de usuario | Rol | Prioridad | Descripción | Criterios de aceptación | Estado | Sprint asignado |
|---|---|---|---|---|---|---|---|
| PB-01 | Inicio de sesión por rol | Usuario | Alta | Permitir acceso al sistema con correo, contraseña y rol. | El usuario inicia sesión y es redirigido a su dashboard correspondiente. | Hecho | Sprint 1 |
| PB-02 | Registro de usuarios | Usuario | Alta | Crear cuenta para paciente, médico, familiar o farmacéutico. | El formulario guarda usuario válido y rechaza campos incompletos. | Hecho | Sprint 1 |
| PB-03 | Recuperación de contraseña | Usuario | Alta | Recuperar acceso mediante token de restablecimiento. | El usuario recibe o visualiza enlace temporal y cambia contraseña. | Hecho | Sprint 1 |
| PB-04 | Validaciones de formulario | Usuario | Media | Validar campos obligatorios, contraseñas y roles. | No se envían formularios incompletos. | Hecho | Sprint 1 |
| PB-05 | Interfaces por rol | Usuario | Alta | Mostrar pantallas distintas según rol. | Cada rol accede solo a su vista. | Hecho | Sprint 1 |
| PB-06 | Cierre de sesión | Usuario | Alta | Permitir finalizar sesión. | El refresh token se invalida y se limpia sesión local. | Hecho | Sprint 1 |
| PB-07 | JWT refresh token | Usuario | Alta | Mantener sesión segura con access y refresh token. | Access token expira y se renueva con refresh válido. | Hecho | Sprint 1 |
| PB-08 | Sesión activa única | Usuario | Alta | Evitar sesiones simultáneas. | Al iniciar sesión, tokens anteriores se invalidan. | Hecho | Sprint 1 |
| PB-09 | Catálogo de medicamentos | Farmacéutico | Alta | Administrar medicamentos disponibles. | Se puede crear, editar y eliminar medicamentos no usados. | Hecho | Sprint 2 |
| PB-10 | Prescripción médica | Médico | Alta | Crear tratamiento para paciente. | Se guarda dosis, horario, duración, indicaciones y stock. | Hecho | Sprint 2 |
| PB-11 | Relación médico-paciente | Médico | Alta | Restringir tratamientos al médico asignado. | Médico no asignado no modifica paciente. | Hecho | Sprint 2 |
| PB-12 | Horarios complejos | Médico | Alta | Programar frecuencias específicas. | El sistema genera tomas según patrón. | Hecho | Sprint 2 |
| PB-13 | Registro de tomas | Paciente | Alta | Marcar toma cumplida o no cumplida. | Se guarda hora real y estado. | Hecho | Sprint 2 |
| PB-14 | Motivo de omisión | Paciente | Alta | Indicar causa si no tomó medicamento. | Se registra motivo seleccionado o capturado. | Hecho | Sprint 2 |
| PB-15 | Efectos adversos | Paciente | Media | Registrar observaciones de reacción adversa. | Se guarda observación asociada a la toma. | En proceso | Sprint 2 |
| PB-16 | Historial de cambios | Médico | Alta | Auditar cambios de prescripción. | Cada creación, edición, desactivación o dispensación queda registrada. | Hecho | Sprint 2 |
| PB-17 | Stock y recarga | Médico/Farmacéutico | Media | Alertar cuando el stock sea bajo. | Prescripciones con stock <= 5 aparecen en alertas. | Hecho | Sprint 2 |
| PB-18 | Interacciones medicamentosas | Médico | Alta | Detectar combinaciones peligrosas. | Si existe interacción alta o crítica, se bloquea prescripción. | Hecho | Sprint 3 |
| PB-19 | Notificaciones escalonadas | Paciente | Alta | Avisar antes y después de la toma. | Se crean avisos 15 min antes, 5 min antes y 10 min después. | Hecho | Sprint 3 |
| PB-20 | SMS simulado | Sistema | Alta | Simular Twilio mediante logs. | Cada aviso vencido crea registro en `sms_log`. | Hecho | Sprint 3 |
| PB-21 | Confirmación de lectura | Paciente | Alta | Confirmar que vio una notificación. | Se actualiza `leida_en` y estado. | Hecho | Sprint 3 |
| PB-22 | Dashboard familiar | Familiar | Alta | Consultar resumen y adherencia del paciente. | Muestra adherencia, omisiones, próxima toma y alertas. | Hecho | Sprint 3 |
| PB-23 | Dashboard médico | Médico | Alta | Consultar pacientes y tratamientos. | Muestra pacientes, adherencia, recetas y notas. | En proceso | Sprint 3 |
| PB-24 | Notas médicas remotas | Médico | Media | Dejar indicaciones al paciente. | Nota aparece en vistas correspondientes. | Hecho | Sprint 3 |
| PB-25 | Equivalentes genéricos | Farmacéutico | Media | Buscar equivalentes por principio activo. | El sistema lista medicamentos relacionados. | Hecho | Sprint 3 |
| PB-26 | Modo hospitalario | Médico | Media | Registrar tomas en lote. | Varias tomas pendientes se actualizan en una acción. | Hecho | Sprint 3 |
| PB-27 | Reporte semanal | Médico/Familiar | Alta | Ver adherencia semanal. | Debe calcular porcentaje semanal. | En proceso | Sprint 3 |
| PB-28 | Exportación PDF/Excel | Médico/Familiar | Alta | Descargar reportes. | Debe generar archivo PDF y Excel. | Pendiente | Sprint 3 |
| PB-29 | Tendencia mensual | Médico/Familiar | Media | Visualizar evolución mensual. | Debe mostrar tendencia por semanas o días. | Pendiente | Sprint 3 |
| PB-30 | Firma digital de reporte | Sistema | Media | Generar hash y timestamp. | Cada exportación debe incluir hash verificable. | Pendiente | Sprint 3 |
| PB-31 | Verificación de registro | Usuario | Alta | Confirmar cuenta por correo o SMS. | Usuario no activo no puede iniciar sesión hasta verificar. | Pendiente | Sprint 3 |
| PB-32 | Preguntas de seguridad | Usuario | Media | Recuperar contraseña con preguntas. | Debe validar pregunta/respuesta antes de reset. | Pendiente | Sprint 3 |
| PB-33 | Doble factor opcional | Usuario | Media | Activar segundo factor. | Usuario recibe o introduce código adicional. | Pendiente | Sprint 3 |
| PB-34 | Dashboard administrador | Administrador | Media | Gestionar usuarios y sistema. | Admin crea, edita y desactiva usuarios. | Pendiente | Sprint 3 |

---

# 7. Planeación Scrum

## Roles Scrum

| Rol Scrum | Responsable sugerido | Función dentro del proyecto |
|---|---|---|
| Product Owner | __________________________ | Define prioridades, valida requerimientos y acepta incrementos. |
| Scrum Master | __________________________ | Facilita la metodología, elimina impedimentos y asegura eventos Scrum. |
| Equipo de desarrollo | __________________________ | Diseña, programa, prueba y documenta las funcionalidades. |

## Artefactos Scrum

### Product Backlog

Lista priorizada de funcionalidades del sistema MedAlert. Incluye historias de usuario, criterios de aceptación, prioridad, estado y sprint asignado.

### Sprint Backlog

Conjunto de historias seleccionadas para cada sprint, junto con sus tareas técnicas, responsables, estimaciones y estado.

### Incremento

Resultado funcional entregado al final de cada sprint. Cada incremento debe cumplir la Definition of Done y ser potencialmente usable.

## Eventos Scrum

### Sprint Planning

Reunión inicial del sprint. El equipo selecciona historias del Product Backlog y define el objetivo del sprint.

### Daily Scrum

Reunión breve diaria donde se responde:

1. Qué se hizo ayer.
2. Qué se hará hoy.
3. Qué impedimentos existen.

### Sprint Review

Revisión del incremento con el Product Owner y posibles interesados. Se valida qué funcionalidades cumplen criterios de aceptación.

### Sprint Retrospective

Reunión interna del equipo para analizar qué funcionó, qué debe mejorar y qué acciones se tomarán en el siguiente sprint.

---

# 8. Sprint 1: Autenticación, Login y Estructura Base

## Objetivo del Sprint

Construir la base del sistema: autenticación, registro, recuperación de contraseña, navegación, interfaces iniciales por rol y estructura mínima de frontend/backend.

## Historias de Usuario del Sprint 1

### HU-01 - Inicio de Sesión

| Campo | Detalle |
|---|---|
| ID de historia | HU-01 |
| Nombre | Inicio de sesión por rol |
| Rol | Usuario |
| Descripción | Como usuario, quiero iniciar sesión con correo, contraseña y rol, para acceder a mi dashboard correspondiente. |
| Criterios de aceptación | El formulario solicita correo, contraseña y rol; rechaza credenciales inválidas; redirige según rol; guarda tokens. |
| Tareas técnicas | Crear endpoint `/auth/login`; validar credenciales; generar JWT; almacenar sesión en frontend; redirigir por rol. |
| Prioridad | Alta |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Usuario autenticado y dirigido a su interfaz. |

### HU-02 - Registro de Usuario

| Campo | Detalle |
|---|---|
| ID de historia | HU-02 |
| Nombre | Registro de usuarios por rol |
| Rol | Usuario |
| Descripción | Como usuario, quiero registrarme con mis datos principales, para poder usar el sistema MedAlert. |
| Criterios de aceptación | El usuario elige rol; se muestran campos correspondientes; se validan campos obligatorios; se guarda en BD. |
| Tareas técnicas | Crear formulario dinámico; crear endpoint `/auth/signup`; insertar usuario según rol; validar duplicados. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Cuenta creada para paciente, médico, familiar o farmacéutico. |

### HU-03 - Recuperación de Contraseña

| Campo | Detalle |
|---|---|
| ID de historia | HU-03 |
| Nombre | Recuperación de contraseña |
| Rol | Usuario |
| Descripción | Como usuario, quiero recuperar mi contraseña, para restablecer el acceso si la olvido. |
| Criterios de aceptación | El usuario ingresa correo; se genera token temporal; puede definir nueva contraseña. |
| Tareas técnicas | Crear tabla `password_resets`; crear endpoints de recuperación; crear pantalla `reset.html`; validar expiración. |
| Prioridad | Alta |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Usuario restablece contraseña mediante token. |

### HU-04 - Validaciones de Formulario

| Campo | Detalle |
|---|---|
| ID de historia | HU-04 |
| Nombre | Validaciones básicas |
| Rol | Usuario |
| Descripción | Como usuario, quiero recibir mensajes claros al capturar datos incorrectos, para corregir formularios. |
| Criterios de aceptación | No se envían campos obligatorios vacíos; se valida confirmación de contraseña; se muestra mensaje de error. |
| Tareas técnicas | Agregar validaciones frontend; agregar validaciones backend; mostrar mensajes en pantalla. |
| Prioridad | Media |
| Estimación | 3 puntos |
| Estado | Hecho |
| Resultado esperado | Formularios con validación mínima funcional. |

### HU-05 - Interfaces Iniciales por Rol

| Campo | Detalle |
|---|---|
| ID de historia | HU-05 |
| Nombre | Dashboards iniciales |
| Rol | Usuario |
| Descripción | Como usuario, quiero ver una pantalla adecuada a mi rol, para acceder solo a funciones relevantes. |
| Criterios de aceptación | Existe pantalla para paciente, médico, familiar y farmacéutico; cada una valida rol antes de cargar. |
| Tareas técnicas | Crear páginas HTML/CSS; implementar guardas por rol; redirigir accesos no autorizados. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Interfaz inicial funcional por rol. |

### HU-06 - Perfil Básico de Usuario

| Campo | Detalle |
|---|---|
| ID de historia | HU-06 |
| Nombre | Perfil básico |
| Rol | Usuario |
| Descripción | Como usuario, quiero visualizar mis datos principales, para confirmar que accedí a la cuenta correcta. |
| Criterios de aceptación | Se muestra nombre, rol y datos principales según usuario. |
| Tareas técnicas | Guardar datos de usuario en localStorage; renderizar nombre y campos básicos en dashboard. |
| Prioridad | Media |
| Estimación | 3 puntos |
| Estado | En proceso |
| Resultado esperado | Perfil visible en interfaces principales. |

### HU-07 - Cierre de Sesión

| Campo | Detalle |
|---|---|
| ID de historia | HU-07 |
| Nombre | Logout |
| Rol | Usuario |
| Descripción | Como usuario, quiero cerrar sesión, para proteger mi cuenta al terminar de usar el sistema. |
| Criterios de aceptación | Se invalida refresh token; se limpia localStorage; se redirige al login. |
| Tareas técnicas | Crear endpoint `/auth/logout`; agregar botón salir; limpiar sesión local. |
| Prioridad | Alta |
| Estimación | 3 puntos |
| Estado | Hecho |
| Resultado esperado | Sesión finalizada correctamente. |

### HU-08 - Navegación Principal

| Campo | Detalle |
|---|---|
| ID de historia | HU-08 |
| Nombre | Navegación base |
| Rol | Usuario |
| Descripción | Como usuario, quiero navegar entre secciones, para consultar la información del sistema fácilmente. |
| Criterios de aceptación | Los enlaces internos funcionan; las secciones están organizadas; el diseño es responsive. |
| Tareas técnicas | Crear menús; organizar secciones; aplicar CSS responsive. |
| Prioridad | Media |
| Estimación | 3 puntos |
| Estado | Hecho |
| Resultado esperado | Navegación clara en dashboards. |

---

# 9. Sprint 2: Gestión de Medicamentos, Horarios y Registro de Tomas

## Objetivo del Sprint

Desarrollar el núcleo funcional del sistema: medicamentos, prescripciones, horarios, tomas, stock, historial y relación médico-paciente.

## Historias de Usuario del Sprint 2

### HU-09 - CRUD de Medicamentos

| Campo | Detalle |
|---|---|
| ID de historia | HU-09 |
| Nombre | Administración de catálogo |
| Rol | Farmacéutico |
| Descripción | Como farmacéutico, quiero administrar el catálogo de medicamentos, para mantener actualizada la información disponible. |
| Criterios de aceptación | Puede crear, editar, consultar y eliminar medicamentos no asociados a prescripciones. |
| Tareas técnicas | Crear endpoints CRUD; crear formulario farmacéutico; validar eliminación segura. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Catálogo administrable desde interfaz farmacéutica. |

### HU-10 - Registro de Dosis

| Campo | Detalle |
|---|---|
| ID de historia | HU-10 |
| Nombre | Captura de dosis |
| Rol | Médico |
| Descripción | Como médico, quiero registrar la dosis del medicamento, para indicar correctamente el tratamiento. |
| Criterios de aceptación | La prescripción guarda dosis; la dosis se muestra al paciente y familiar. |
| Tareas técnicas | Agregar campo dosis; guardar en `prescripcion`; renderizar en vistas. |
| Prioridad | Alta |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Dosis disponible en todas las vistas relevantes. |

### HU-11 - Frecuencia y Horarios

| Campo | Detalle |
|---|---|
| ID de historia | HU-11 |
| Nombre | Programación de horarios |
| Rol | Médico |
| Descripción | Como médico, quiero configurar frecuencia y horarios, para que el sistema genere recordatorios. |
| Criterios de aceptación | Al guardar prescripción se generan tomas con fecha y hora programada. |
| Tareas técnicas | Normalizar patrones; generar tomas; guardar en `toma_recordatorio`. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Tomas programadas automáticamente. |

### HU-12 - Horarios Complejos

| Campo | Detalle |
|---|---|
| ID de historia | HU-12 |
| Nombre | Patrones complejos |
| Rol | Médico |
| Descripción | Como médico, quiero configurar días alternos, fines de semana o antes de comida, para adaptar el tratamiento. |
| Criterios de aceptación | El sistema genera tomas según cada patrón configurado. |
| Tareas técnicas | Implementar patrones; mostrar chips de horario; validar duración. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Prescripciones con horarios complejos básicos. |

### HU-13 - Registro de Tomas

| Campo | Detalle |
|---|---|
| ID de historia | HU-13 |
| Nombre | Marcar toma |
| Rol | Paciente |
| Descripción | Como paciente, quiero marcar una toma como cumplida o no cumplida, para registrar mi adherencia. |
| Criterios de aceptación | Se actualiza estado; se guarda hora real si fue cumplida; se refleja en historial. |
| Tareas técnicas | Crear endpoint de marcado; agregar botones en paciente; recalcular métricas. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Tomas registradas correctamente. |

### HU-14 - Motivo de Omisión

| Campo | Detalle |
|---|---|
| ID de historia | HU-14 |
| Nombre | Registrar motivo |
| Rol | Paciente |
| Descripción | Como paciente, quiero indicar por qué omití una toma, para que el médico comprenda mi situación. |
| Criterios de aceptación | Si la toma es no cumplida, debe guardarse motivo de omisión. |
| Tareas técnicas | Agregar campo `motivo_omision`; validar valores; mostrar en historial. |
| Prioridad | Alta |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Omisiones documentadas. |

### HU-15 - Registro de Efectos Adversos

| Campo | Detalle |
|---|---|
| ID de historia | HU-15 |
| Nombre | Efectos adversos |
| Rol | Paciente |
| Descripción | Como paciente, quiero registrar efectos adversos, para informar al médico de reacciones al medicamento. |
| Criterios de aceptación | El sistema guarda observaciones asociadas a una toma. |
| Tareas técnicas | Capturar observación; guardar en BD; mostrar en historial. |
| Prioridad | Media |
| Estimación | 5 puntos |
| Estado | En proceso |
| Resultado esperado | Reacciones registradas como observaciones; falta dropdown formal. |

### HU-16 - Stock Estimado

| Campo | Detalle |
|---|---|
| ID de historia | HU-16 |
| Nombre | Control de stock |
| Rol | Médico/Farmacéutico |
| Descripción | Como médico o farmacéutico, quiero registrar stock estimado, para anticipar recargas. |
| Criterios de aceptación | La prescripción guarda stock y se muestra en recetas activas. |
| Tareas técnicas | Agregar campo stock; actualizar en dispensación; mostrar en panel médico/farmacéutico. |
| Prioridad | Media |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Stock visible y actualizable. |

### HU-17 - Alertas de Recarga

| Campo | Detalle |
|---|---|
| ID de historia | HU-17 |
| Nombre | Alerta de bajo stock |
| Rol | Médico |
| Descripción | Como médico, quiero ver alertas de bajo stock, para solicitar recarga o dispensación oportuna. |
| Criterios de aceptación | Prescripciones con stock <= 5 aparecen en alerta. |
| Tareas técnicas | Crear endpoint de alertas; crear componente visual; filtrar por permisos. |
| Prioridad | Media |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Lista de recargas urgentes en panel médico. |

### HU-18 - Historial de Cambios

| Campo | Detalle |
|---|---|
| ID de historia | HU-18 |
| Nombre | Historial de prescripción |
| Rol | Médico |
| Descripción | Como médico, quiero consultar cambios de una prescripción, para auditar ajustes de tratamiento. |
| Criterios de aceptación | Se registran creación, actualización, desactivación y dispensación. |
| Tareas técnicas | Crear tabla historial; guardar eventos; crear endpoint; mostrar historial. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Cambios consultables desde panel médico. |

### HU-19 - Relación Médico-Paciente

| Campo | Detalle |
|---|---|
| ID de historia | HU-19 |
| Nombre | Control de permisos clínicos |
| Rol | Médico |
| Descripción | Como médico asignado, quiero modificar solo mis pacientes, para proteger la información clínica. |
| Criterios de aceptación | Un médico no asignado recibe error 403 al modificar paciente ajeno. |
| Tareas técnicas | Agregar validación en backend; consultar `id_medico`; restringir endpoints. |
| Prioridad | Alta |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Tratamientos protegidos por relación médico-paciente. |

---

# 10. Sprint 3: Funcionalidades Pendientes, Reportes, Telemedicina e Integraciones

## Objetivo del Sprint

Integrar funcionalidades avanzadas, cerrar brechas contra los requerimientos y fortalecer el sistema con notificaciones, reportes, dashboards, telemedicina, interacciones, modo hospitalario e integraciones simuladas.

## Historias de Usuario del Sprint 3

### HU-20 - Notificaciones Escalonadas

| Campo | Detalle |
|---|---|
| ID de historia | HU-20 |
| Nombre | Avisos escalonados |
| Rol | Paciente |
| Descripción | Como paciente, quiero recibir avisos antes y después de una toma, para no olvidar mi medicamento. |
| Criterios de aceptación | Se generan avisos 15 minutos antes, 5 minutos antes y 10 minutos después. |
| Tareas técnicas | Crear tabla de notificaciones; crear scheduler; asociar avisos a tomas. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Notificaciones programadas por cada toma pendiente. |

### HU-21 - SMS Simulado con Logs

| Campo | Detalle |
|---|---|
| ID de historia | HU-21 |
| Nombre | Simulación SMS tipo Twilio |
| Rol | Sistema |
| Descripción | Como sistema, quiero simular envío de SMS mediante logs, para demostrar la integración sin proveedor real. |
| Criterios de aceptación | Cada aviso enviado genera registro en `sms_log`. |
| Tareas técnicas | Crear tabla `sms_log`; procesar notificaciones vencidas; guardar proveedor simulado. |
| Prioridad | Alta |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Evidencia de SMS simulado en base de datos. |

### HU-22 - Confirmación de Lectura

| Campo | Detalle |
|---|---|
| ID de historia | HU-22 |
| Nombre | Lectura de notificaciones |
| Rol | Paciente |
| Descripción | Como paciente, quiero confirmar que leí una notificación, para que el sistema registre mi seguimiento. |
| Criterios de aceptación | Al confirmar, se guarda `leida_en` y estado `leida`. |
| Tareas técnicas | Crear endpoint de lectura; crear botón en paciente; actualizar estado. |
| Prioridad | Alta |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Confirmación visible en historial de notificaciones. |

### HU-23 - Reporte Semanal de Adherencia

| Campo | Detalle |
|---|---|
| ID de historia | HU-23 |
| Nombre | Reporte semanal |
| Rol | Médico/Familiar |
| Descripción | Como médico o familiar, quiero consultar la adherencia semanal, para evaluar el cumplimiento del tratamiento. |
| Criterios de aceptación | Se calcula porcentaje semanal de tomas cumplidas contra total. |
| Tareas técnicas | Crear consulta semanal; mostrar indicadores; validar por paciente. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | En proceso |
| Resultado esperado | Indicadores semanales disponibles en dashboard. |

### HU-24 - Gráficas Interactivas

| Campo | Detalle |
|---|---|
| ID de historia | HU-24 |
| Nombre | Visualización gráfica |
| Rol | Médico/Familiar |
| Descripción | Como usuario de seguimiento, quiero ver gráficas, para interpretar fácilmente la evolución del paciente. |
| Criterios de aceptación | El dashboard muestra gráficas claras de adherencia. |
| Tareas técnicas | Integrar librería o componentes gráficos; alimentar datos desde API. |
| Prioridad | Media |
| Estimación | 8 puntos |
| Estado | En proceso |
| Resultado esperado | Gráficas básicas; falta interacción avanzada. |

### HU-25 - Exportación PDF y Excel

| Campo | Detalle |
|---|---|
| ID de historia | HU-25 |
| Nombre | Exportar reportes |
| Rol | Médico/Familiar |
| Descripción | Como médico o familiar, quiero exportar reportes a PDF y Excel, para compartir evidencia del tratamiento. |
| Criterios de aceptación | El sistema genera archivo PDF y Excel con datos del paciente y adherencia. |
| Tareas técnicas | Crear endpoints de exportación; generar PDF; generar Excel; agregar botones. |
| Prioridad | Alta |
| Estimación | 13 puntos |
| Estado | Pendiente |
| Resultado esperado | Reportes descargables. |

### HU-26 - Comparativo Semanal

| Campo | Detalle |
|---|---|
| ID de historia | HU-26 |
| Nombre | Esta semana vs semana anterior |
| Rol | Familiar/Médico |
| Descripción | Como usuario de seguimiento, quiero comparar esta semana contra la anterior, para identificar mejora o deterioro. |
| Criterios de aceptación | Se muestran porcentajes de ambas semanas. |
| Tareas técnicas | Consultar datos por rango; calcular porcentajes; mostrar comparación. |
| Prioridad | Alta |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Comparativo visible en vista familiar. |

### HU-27 - Tendencia Mensual

| Campo | Detalle |
|---|---|
| ID de historia | HU-27 |
| Nombre | Tendencia mensual |
| Rol | Médico/Familiar |
| Descripción | Como médico o familiar, quiero ver tendencia mensual, para evaluar evolución prolongada. |
| Criterios de aceptación | Se muestra adherencia agrupada por semana o día durante el mes. |
| Tareas técnicas | Crear consulta mensual; crear gráfica; agregar filtro por mes. |
| Prioridad | Media |
| Estimación | 8 puntos |
| Estado | Pendiente |
| Resultado esperado | Gráfica de tendencia mensual. |

### HU-28 - Firma Digital de Reporte

| Campo | Detalle |
|---|---|
| ID de historia | HU-28 |
| Nombre | Hash y timestamp |
| Rol | Sistema |
| Descripción | Como sistema, quiero firmar digitalmente reportes, para garantizar integridad del documento exportado. |
| Criterios de aceptación | Cada exportación incluye hash SHA-256 y timestamp. |
| Tareas técnicas | Generar hash del contenido; guardar registro; insertar timestamp en reporte. |
| Prioridad | Media |
| Estimación | 8 puntos |
| Estado | Pendiente |
| Resultado esperado | Reportes verificables. |

### HU-29 - Dashboard Médico

| Campo | Detalle |
|---|---|
| ID de historia | HU-29 |
| Nombre | Panel de pacientes |
| Rol | Médico |
| Descripción | Como médico, quiero ver múltiples pacientes, para priorizar seguimiento clínico. |
| Criterios de aceptación | Se lista cada paciente con adherencia y omisiones. |
| Tareas técnicas | Crear endpoint de pacientes; mostrar lista; agregar indicadores. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | En proceso |
| Resultado esperado | Dashboard médico operativo; falta porcentaje de omisiones justificadas. |

### HU-30 - Vista Familiar y Alertas 70%

| Campo | Detalle |
|---|---|
| ID de historia | HU-30 |
| Nombre | Vista familiar |
| Rol | Familiar |
| Descripción | Como familiar, quiero ver resumen y alertas, para apoyar al paciente. |
| Criterios de aceptación | Si la adherencia es menor a 70%, se muestra alerta. |
| Tareas técnicas | Crear endpoint familiar; cargar resumen; calcular alerta. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Vista familiar funcional. |

### HU-31 - Modo Farmacéutico y Genéricos

| Campo | Detalle |
|---|---|
| ID de historia | HU-31 |
| Nombre | Equivalencias farmacéuticas |
| Rol | Farmacéutico |
| Descripción | Como farmacéutico, quiero sugerir genéricos equivalentes, para apoyar la dispensación. |
| Criterios de aceptación | Buscar por principio activo devuelve medicamentos relacionados. |
| Tareas técnicas | Consultar catálogo; filtrar por principio activo; mostrar resultados. |
| Prioridad | Media |
| Estimación | 5 puntos |
| Estado | Hecho |
| Resultado esperado | Equivalencias visibles en panel farmacéutico. |

### HU-32 - Interacciones entre Medicamentos

| Campo | Detalle |
|---|---|
| ID de historia | HU-32 |
| Nombre | Validación de interacciones |
| Rol | Médico |
| Descripción | Como médico, quiero recibir alertas de interacción, para evitar combinaciones riesgosas. |
| Criterios de aceptación | Interacciones altas o críticas bloquean la prescripción. |
| Tareas técnicas | Crear tabla de interacciones; cargar 20 registros; validar al prescribir. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Interacciones peligrosas detectadas. |

### HU-33 - Ajuste Remoto de Dosis

| Campo | Detalle |
|---|---|
| ID de historia | HU-33 |
| Nombre | Ajustar prescripción |
| Rol | Médico |
| Descripción | Como médico, quiero ajustar dosis remotamente, para actualizar el tratamiento sin visita presencial. |
| Criterios de aceptación | El médico asignado puede editar dosis y horario; se registra historial. |
| Tareas técnicas | Crear endpoint PUT; cargar receta al formulario; guardar historial. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Tratamiento ajustable desde panel médico. |

### HU-34 - Prescripciones Digitales

| Campo | Detalle |
|---|---|
| ID de historia | HU-34 |
| Nombre | Receta digital automática |
| Rol | Médico |
| Descripción | Como médico, quiero crear prescripciones digitales, para que aparezcan como recordatorios automáticos. |
| Criterios de aceptación | Al crear prescripción se generan tomas futuras. |
| Tareas técnicas | Crear tabla `prescripcion`; generar tomas; mostrar en paciente. |
| Prioridad | Alta |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Recetas activas con recordatorios. |

### HU-35 - Modo Hospitalario

| Campo | Detalle |
|---|---|
| ID de historia | HU-35 |
| Nombre | Registro en lote |
| Rol | Médico/Enfermería |
| Descripción | Como personal hospitalario, quiero registrar tomas en lote, para agilizar el seguimiento de pacientes internados. |
| Criterios de aceptación | Varias tomas seleccionadas se marcan como cumplidas en una sola acción. |
| Tareas técnicas | Crear endpoint lote; agregar formulario hospitalario; guardar modo de registro. |
| Prioridad | Media |
| Estimación | 8 puntos |
| Estado | Hecho |
| Resultado esperado | Tomas hospitalarias registradas en lote. |

---

# 11. Sprint Backlog por Sprint

## Sprint Backlog - Sprint 1

| Historia de usuario | Tareas | Responsable | Prioridad | Estimación | Estado | Observaciones |
|---|---|---|---|---|---|---|
| HU-01 | Endpoint login, validación, tokens, redirección por rol | Equipo desarrollo | Alta | 5 | Hecho | Base de autenticación funcional. |
| HU-02 | Formulario registro, campos por rol, inserción BD | Equipo desarrollo | Alta | 8 | Hecho | Falta verificación de cuenta. |
| HU-03 | Token reset, pantalla reset, actualización contraseña | Equipo desarrollo | Alta | 5 | Hecho | Falta preguntas de seguridad. |
| HU-04 | Validaciones frontend/backend | Equipo desarrollo | Media | 3 | Hecho | Validaciones básicas. |
| HU-05 | Dashboards HTML/CSS por rol | Equipo desarrollo | Alta | 8 | Hecho | Admin pendiente. |
| HU-06 | Perfil básico en interfaz | Equipo desarrollo | Media | 3 | En proceso | PerfilDoctor estático. |
| HU-07 | Logout e invalidación de refresh token | Equipo desarrollo | Alta | 3 | Hecho | Sesión finaliza correctamente. |
| HU-08 | Navegación entre secciones | Equipo desarrollo | Media | 3 | Hecho | Navegación interna funcional. |

## Sprint Backlog - Sprint 2

| Historia de usuario | Tareas | Responsable | Prioridad | Estimación | Estado | Observaciones |
|---|---|---|---|---|---|---|
| HU-09 | CRUD catálogo, formulario farmacéutico, validaciones | Equipo desarrollo | Alta | 8 | Hecho | Eliminar bloqueado si está en uso. |
| HU-10 | Campo dosis, persistencia, renderizado | Equipo desarrollo | Alta | 5 | Hecho | Falta cálculo clínico avanzado. |
| HU-11 | Generar tomas por frecuencia | Equipo desarrollo | Alta | 8 | Hecho | Funciona con patrones predefinidos. |
| HU-12 | Días alternos, fines de semana, antes de comida | Equipo desarrollo | Alta | 8 | Hecho | Falta recurrencia personalizada avanzada. |
| HU-13 | Endpoint marcar toma, botones paciente | Equipo desarrollo | Alta | 8 | Hecho | Registra hora real. |
| HU-14 | Motivo de omisión | Equipo desarrollo | Alta | 5 | Hecho | Valores controlados en BD. |
| HU-15 | Observaciones por efecto adverso | Equipo desarrollo | Media | 5 | En proceso | Falta dropdown. |
| HU-16 | Stock en prescripción y dispensación | Equipo desarrollo | Media | 5 | Hecho | Stock se incrementa al dispensar. |
| HU-17 | Alertas bajo stock | Equipo desarrollo | Media | 5 | Hecho | Umbral actual: stock <= 5. |
| HU-18 | Tabla historial y consulta visual | Equipo desarrollo | Alta | 8 | Hecho | Mejorable con comparación detallada. |
| HU-19 | Restricción médico-paciente | Equipo desarrollo | Alta | 5 | Hecho | Protege modificaciones clínicas. |

## Sprint Backlog - Sprint 3

| Historia de usuario | Tareas | Responsable | Prioridad | Estimación | Estado | Observaciones |
|---|---|---|---|---|---|---|
| HU-20 | Tabla notificaciones, scheduler, etapas | Equipo desarrollo | Alta | 8 | Hecho | Avisos escalonados creados. |
| HU-21 | Tabla SMS log, envío simulado | Equipo desarrollo | Alta | 5 | Hecho | Simula Twilio con logs. |
| HU-22 | Confirmación de lectura | Equipo desarrollo | Alta | 5 | Hecho | Disponible para paciente. |
| HU-23 | Reporte semanal | Equipo desarrollo | Alta | 8 | En proceso | Ya hay métricas, falta reporte formal. |
| HU-24 | Gráficas interactivas | Equipo desarrollo | Media | 8 | En proceso | Vista familiar tiene gráfica básica. |
| HU-25 | Exportación PDF/Excel | Equipo desarrollo | Alta | 13 | Pendiente | Requiere librerías de generación. |
| HU-26 | Comparativo semanal | Equipo desarrollo | Alta | 5 | Hecho | Implementado en resumen familiar. |
| HU-27 | Tendencia mensual | Equipo desarrollo | Media | 8 | Pendiente | Requiere consulta mensual. |
| HU-28 | Firma digital | Equipo desarrollo | Media | 8 | Pendiente | Hash y timestamp pendientes. |
| HU-29 | Dashboard médico | Equipo desarrollo | Alta | 8 | En proceso | Falta omisiones justificadas %. |
| HU-30 | Vista familiar y alertas | Equipo desarrollo | Alta | 8 | Hecho | Alerta bajo 70%. |
| HU-31 | Genéricos equivalentes | Equipo desarrollo | Media | 5 | Hecho | Busca por principio activo. |
| HU-32 | Interacciones | Equipo desarrollo | Alta | 8 | Hecho | 20 interacciones cargadas. |
| HU-33 | Ajuste remoto | Equipo desarrollo | Alta | 8 | Hecho | Médico edita tratamiento. |
| HU-34 | Prescripciones digitales | Equipo desarrollo | Alta | 8 | Hecho | Genera recordatorios. |
| HU-35 | Modo hospitalario | Equipo desarrollo | Media | 8 | Hecho | Registra tomas en lote. |

---

# 12. Definición de Terminado

Una historia de usuario se considera terminada cuando cumple con los siguientes puntos:

1. La funcionalidad está implementada en frontend y backend cuando aplica.
2. Los criterios de aceptación fueron cumplidos.
3. Existen validaciones de datos obligatorios.
4. La interfaz es usable y responsive.
5. El usuario recibe mensajes claros de éxito o error.
6. Los endpoints protegidos validan JWT.
7. Los endpoints restringidos validan rol.
8. No existen errores críticos de ejecución.
9. El código está organizado en rutas, controladores, servicios y vistas.
10. La base de datos contiene las tablas necesarias.
11. Se ejecutaron pruebas básicas o verificación sintáctica.
12. La documentación fue actualizada.
13. El incremento puede demostrarse en Sprint Review.

---

# 13. Revisión de lo que Hace el Sistema

## Qué Puede Hacer el Paciente

El paciente puede:

- Iniciar sesión.
- Consultar medicamentos activos.
- Ver dosis, frecuencia, duración e indicaciones.
- Consultar próxima toma.
- Marcar toma como cumplida.
- Marcar toma como no cumplida.
- Registrar motivo de omisión.
- Registrar observaciones relacionadas con la toma.
- Consultar historial de tomas.
- Consultar notificaciones SMS simuladas.
- Confirmar lectura de notificaciones.

## Qué Puede Hacer el Médico

El médico puede:

- Iniciar sesión.
- Ver pacientes asignados.
- Consultar adherencia y omisiones.
- Crear prescripciones.
- Editar prescripciones.
- Desactivar prescripciones.
- Ajustar dosis remotamente.
- Configurar horarios complejos.
- Consultar recetas activas.
- Dejar notas médicas.
- Consultar historial de versiones.
- Ver alertas de bajo stock.
- Registrar tomas hospitalarias en lote.
- Validar interacciones al prescribir.

## Qué Puede Hacer el Cuidador

El cuidador o familiar puede:

- Iniciar sesión.
- Ver resumen del paciente vinculado.
- Consultar adherencia.
- Consultar medicamentos activos.
- Ver historial de tomas.
- Revisar notas médicas.
- Recibir alerta visual si la adherencia es menor al 70%.
- Consultar próxima toma.

## Qué Puede Hacer el Farmacéutico

El farmacéutico puede:

- Iniciar sesión.
- Consultar recetas por paciente.
- Dispensar prescripciones.
- Actualizar stock mediante dispensación.
- Crear medicamentos en catálogo.
- Editar medicamentos.
- Eliminar medicamentos no asociados.
- Buscar equivalentes por principio activo.

## Qué Puede Hacer el Administrador

Actualmente el sistema contempla el rol administrador en autenticación y base de datos. Puede iniciar sesión si existe una cuenta válida. Sin embargo, el módulo administrativo visual está pendiente.

Funcionalidades esperadas:

- Crear usuarios.
- Editar usuarios.
- Desactivar usuarios.
- Gestionar roles.
- Supervisar actividad del sistema.

## Módulos Completos

- Login y autenticación JWT.
- Sesión activa única.
- Interfaces principales por rol.
- Catálogo farmacéutico CRUD.
- Prescripción médica.
- Registro de tomas.
- Relación médico-paciente.
- Interacciones comunes.
- SMS simulado.
- Confirmación de lectura.
- Modo hospitalario.
- Alertas de stock.
- Vista familiar básica.

## Módulos Incompletos

- Verificación de registro por correo/SMS.
- Preguntas de seguridad.
- Doble factor opcional.
- Reportes PDF/Excel.
- Firma digital de reportes.
- Tendencia mensual.
- Dashboard administrador.
- Dropdown formal de efectos adversos.
- Reportes interactivos avanzados.

## Módulos a Integrar en el Último Sprint

El Sprint 3 debe cerrar principalmente:

- Reportes exportables.
- Firma digital.
- Tendencia mensual.
- Verificación de cuenta.
- Preguntas de seguridad.
- Doble factor opcional.
- Dashboard administrador.
- Mejoras visuales de reportes.
- Métrica de omisiones justificadas.

---

# 14. Funcionalidades Faltantes

| Funcionalidad faltante | Módulo | Importancia | Riesgo si no se implementa | Sprint donde se debe completar | Observaciones |
|---|---|---|---|---|---|
| Verificación por correo/SMS al registro | Usuarios | Alta | Usuarios falsos o no verificados pueden acceder. | Sprint 3 | Requiere campo `verificado`. |
| Preguntas de seguridad | Usuarios | Media | Recuperación incompleta contra requerimiento. | Sprint 3 | Complementa recuperación actual. |
| Doble factor opcional | Usuarios | Media | Menor seguridad de cuentas sensibles. | Sprint 3 | Puede simularse por código temporal. |
| Dashboard administrador | Administración | Media | No hay control visual centralizado. | Sprint 3 | Rol existe, interfaz no. |
| Exportación PDF | Reportes | Alta | No se cumple entrega de reporte formal. | Sprint 3 | Requiere librería PDF. |
| Exportación Excel | Reportes | Alta | Dificulta análisis externo. | Sprint 3 | Requiere generación XLSX/CSV. |
| Firma digital con hash | Reportes | Media | Reportes no verificables. | Sprint 3 | Usar SHA-256 y timestamp. |
| Tendencia mensual | Reportes | Media | No se observa evolución prolongada. | Sprint 3 | Consulta agrupada por periodo. |
| Gráficas interactivas | Reportes | Media | Visualización limitada. | Sprint 3 | Puede integrarse Chart.js. |
| Dropdown de efectos adversos | Tomas | Media | Captura no estandarizada. | Sprint 3 | Valores: náusea, mareo, somnolencia, otro. |
| Omisiones justificadas en dashboard médico | Dashboard médico | Media | Métrica solicitada incompleta. | Sprint 3 | Ya existe campo `omision_justificada`. |
| Notificaciones push/correo reales | Notificaciones | Baja/Media | Solo se demuestra SMS simulado. | Sprint 3 o futuro | Depende de proveedores externos. |
| Integración Twilio real | Notificaciones | Baja | SMS no se envía realmente. | Futuro | El requerimiento permite simulación con log. |
| Selección de múltiples pacientes en familiar | Familiar | Media | Cuidador con varios pacientes no navega cómodamente. | Sprint 3 | La relación N:M existe. |

---

# 15. Riesgos del Proyecto

| Riesgo | Descripción | Impacto | Probabilidad | Plan de mitigación |
|---|---|---|---|---|
| Alcance amplio | El proyecto tiene muchos módulos: usuarios, medicamentos, notificaciones, reportes y dashboards. | Alto | Alta | Priorizar por valor y cerrar primero funcionalidades críticas. |
| Seguridad insuficiente | Falta verificación de cuenta, preguntas de seguridad y 2FA. | Alto | Media | Implementar controles pendientes en Sprint 3. |
| Reportes no terminados | PDF, Excel, firma y tendencia mensual aún no están completos. | Alto | Alta | Asignar historias específicas y usar librerías existentes. |
| Datos clínicos sensibles | El sistema maneja información médica. | Alto | Media | Validar roles, permisos y proteger endpoints. |
| Dependencia de proveedores externos | SMS real, correo y push requieren servicios externos. | Medio | Media | Mantener simulación por logs y documentar alcance. |
| Complejidad de horarios | Horarios personalizados pueden crecer mucho. | Medio | Media | Limitar patrones en MVP y ampliar después. |
| Interacciones incompletas | La base local solo contiene 20 interacciones. | Medio | Media | Documentar alcance y permitir ampliación futura. |
| Falta de pruebas automatizadas | Actualmente la verificación principal es sintáctica y funcional manual. | Medio | Alta | Agregar pruebas unitarias e integración. |
| Errores en migraciones | Cambios de esquema pueden afectar datos existentes. | Alto | Media | Usar migraciones incrementales y respaldos. |
| Usabilidad móvil | Aunque la app es responsive, pueden existir detalles visuales por pantalla. | Medio | Media | Revisar en diferentes resoluciones. |
| Falta de dashboard administrador | Admin existe, pero sin panel completo. | Medio | Alta | Implementar CRUD administrativo en Sprint 3. |

---

# 16. Conclusión

Scrum permitió dividir el proyecto MedAlert en incrementos claros y manejables. Debido a que el sistema contiene múltiples módulos y usuarios con necesidades distintas, la división en sprints facilitó organizar el trabajo por prioridades.

En el **Sprint 1** se construyó la base del sistema: login, registro, recuperación de contraseña, validaciones, cierre de sesión, navegación e interfaces iniciales por rol. Este sprint fue fundamental porque permitió tener una estructura funcional para que los demás módulos pudieran integrarse posteriormente.

En el **Sprint 2** se desarrolló el núcleo operativo de MedAlert: medicamentos, prescripciones, horarios, tomas, motivos de omisión, stock, historial de cambios y relación médico-paciente. Este sprint convirtió la aplicación en una herramienta funcional para el seguimiento de tratamientos.

En el **Sprint 3** se integraron funcionalidades avanzadas y se identificaron los pendientes finales: notificaciones escalonadas, SMS simulado, confirmación de lectura, vista familiar, modo farmacéutico, interacciones, ajuste remoto, prescripciones digitales y modo hospitalario. También se establecieron como pendientes principales los reportes exportables, firma digital, tendencia mensual, verificación de cuenta, doble factor y dashboard administrativo.

MedAlert representa un sistema de apoyo importante para pacientes, médicos y cuidadores porque permite mejorar la adherencia al tratamiento, reducir olvidos, registrar omisiones, facilitar el seguimiento médico remoto y apoyar la toma de decisiones clínicas mediante información organizada. Aunque aún existen funcionalidades por completar, el sistema cuenta con una base sólida y una planeación Scrum clara para cerrar las brechas restantes.

