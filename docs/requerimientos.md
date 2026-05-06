# Requerimientos cubiertos en la primera reunión -- 1 de mayo de 2026

## Descripción general del sistema

Sistema de recordatorios para pacientes, orientado a la administración
de dosis de medicamentos y al monitoreo de su consumo en los tiempos
indicados. Incluye el registro de datos del paciente.

## Roles y funcionalidades

### Paciente

-   Información médica\
-   Nombre completo\
-   Edad\
-   Estatura\
-   Peso estimado\
-   Número de contacto\
-   Correo electrónico\
-   Historial clínico\
-   Alergias

### Familiar o cuidador

-   Nombre completo\
-   Edad\
-   Número de contacto\
-   Correo electrónico\
-   Relación con el paciente\
-   Posibilidad de tener más de un paciente asignado

### Médico

-   Nombre completo\
-   Cédula profesional\
-   Especialidad\
-   Datos de contacto (número y correo)

### Farmacéutico

-   Nombre completo\
-   Cédula profesional\
-   Datos de contacto (número y correo)\
-   Permisos para dispensar medicamentos

### Administrador

-   Nombre\
-   Correo o teléfono\
-   Contraseña (mínimo 10 y máximo 15 caracteres, incluyendo mayúsculas,
    minúsculas, números y un símbolo especial)

## Requerimientos funcionales adicionales

-   Aplicación web responsive compatible con dispositivos móviles\
-   El administrador es el único responsable de dar de alta a los
    usuarios\
-   El usuario principal será el cliente\
-   El médico registra a los cuidadores\
-   Token con duración de 5 minutos antes de invalidarse\
-   Dashboard con operaciones CRUD para el farmacéutico\
-   Recordatorios: 2 horas antes y al momento de la toma de la dosis\
-   Métricas del avance en el consumo de medicamentos del paciente\
-   Exportación de información en formato PDF\
-   Envío de mensajes SMS para notificaciones
