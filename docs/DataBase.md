# 📋 Documentación — Sistema de Recordatorios de Medicamentos

> Guía paso a paso para configurar la base de datos y ejecutar el proyecto desde cero.

---

## Tabla de contenidos

1. [Requisitos previos](#1-requisitos-previos)
2. [Crear la base de datos con XAMPP y phpMyAdmin](#2-crear-la-base-de-datos-con-xampp-y-phpmyadmin)
3. [Configurar el proyecto Node.js](#3-configurar-el-proyecto-nodejs)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Ejecutar las migraciones](#5-ejecutar-las-migraciones)
6. [Ejecutar los seeders](#6-ejecutar-los-seeders)
7. [Arrancar el servidor](#7-arrancar-el-servidor)
8. [Comandos de referencia rápida](#8-comandos-de-referencia-rápida)
9. [Solución de errores comunes](#9-solución-de-errores-comunes)

---

## 1. Requisitos previos

Antes de empezar asegúrate de tener instalado lo siguiente:

| Herramienta | Versión mínima | Descarga |
|-------------|---------------|---------|
| XAMPP       | 8.x           | https://www.apachefriends.org |
| Node.js     | 18.x          | https://nodejs.org |
| npm         | 9.x           | Viene incluido con Node.js |

Para verificar que Node y npm están instalados abre tu terminal y ejecuta:

```bash
node --version
npm --version
```

---

## 2. Crear la base de datos con XAMPP y phpMyAdmin

### 2.1 Iniciar los servicios de XAMPP

1. Abre el **Panel de Control de XAMPP**
2. Haz clic en **Start** en los módulos **Apache** y **MySQL**
3. Espera a que ambos estén en verde

![Estado XAMPP](https://i.imgur.com/placeholder.png)

> ⚠️ Si el puerto 3306 está ocupado, MySQL no iniciará. Asegúrate de no tener otro servicio usando ese puerto.

### 2.2 Abrir phpMyAdmin

1. Con XAMPP corriendo, abre tu navegador
2. Entra a: **http://localhost/phpmyadmin**
3. Usuario por defecto: `root` — Contraseña: *(vacía)*

### 2.3 Crear la base de datos

1. En el panel izquierdo haz clic en **Nueva** (o **New**)
2. En el campo **Nombre de la base de datos** escribe:

```
recordatorios_db
```

3. En el selector de cotejamiento elige: `utf8mb4_unicode_ci`
4. Haz clic en **Crear**

✅ La base de datos `recordatorios_db` aparecerá en el panel izquierdo. Eso es todo desde phpMyAdmin — las tablas las crean las migraciones automáticamente.

---

## 3. Configurar el proyecto Node.js

### 3.1 Estructura del proyecto

```
recordatorios-api/
├── index.js                  ← Servidor principal
├── package.json              ← Dependencias y scripts
├── .env.example              ← Plantilla de configuración
├── .gitignore
└── src/
    └── database/
        ├── connection.js     ← Pool de conexiones a MySQL
        ├── migrate.js        ← Crea las tablas en la BD
        └── seeder.js         ← Inserta datos de prueba
```

### 3.2 Instalar dependencias

Abre una terminal dentro de la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto instalará:
- **mysql2** — cliente MySQL para Node.js
- **dotenv** — carga las variables de entorno desde `.env`
- **nodemon** — reinicia el servidor automáticamente al guardar cambios (solo en desarrollo)

---

## 4. Variables de entorno

El proyecto usa un archivo `.env` para guardar la configuración sensible (credenciales de base de datos, puerto, etc.). Este archivo **nunca se sube a Git**.

### 4.1 Crear el archivo `.env`

Copia el archivo de ejemplo:

```bash
# En Mac/Linux
cp .env.example .env

# En Windows (CMD)
copy .env.example .env
```

### 4.2 Editar el archivo `.env`

Abre `.env` con cualquier editor de texto y ajusta los valores:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=        ← Dejar vacío si usas XAMPP por defecto
DB_NAME=recordatorios_db
PORT=3000
```

> 💡 En XAMPP el usuario por defecto es `root` y la contraseña está vacía. Si le pusiste contraseña a MySQL, escríbela en `DB_PASSWORD`.

---

## 5. Ejecutar las migraciones

Las migraciones crean automáticamente **todas las tablas** de la base de datos en el orden correcto, respetando las llaves foráneas.

### Tablas que se crean

| # | Tabla | Descripción |
|---|-------|-------------|
| 1 | `administrador` | Usuarios administradores del sistema |
| 2 | `medico` | Médicos registrados |
| 3 | `farmaceutico` | Farmacéuticos con o sin permiso de dispensar |
| 4 | `paciente` | Pacientes con historial y alergias |
| 5 | `familiar_cuidador` | Familiares o cuidadores asignados |
| 6 | `familiar_paciente` | Relación N:M entre cuidadores y pacientes |
| 7 | `medicamento` | Catálogo de medicamentos |
| 8 | `recordatorio` | Recordatorios de toma con estatus |
| 9 | `token_sesion` | Tokens de sesión con vigencia de 5 minutos |

También se crean:
- **Trigger** `trg_recordatorio_before_insert` — calcula automáticamente el campo `recordatorio_2h_antes`
- **Vista** `vista_metricas_paciente` — métricas de adherencia por paciente

### Ejecutar las migraciones

```bash
npm run migrate
```

### Salida esperada

```
🚀 Iniciando migraciones...

  ✅ Crear base de datos
  ✅ Tabla: administrador
  ✅ Tabla: medico
  ✅ Tabla: farmaceutico
  ✅ Tabla: paciente
  ✅ Tabla: familiar_cuidador
  ✅ Tabla: familiar_paciente (N:M)
  ✅ Tabla: medicamento
  ✅ Tabla: recordatorio
  ✅ Tabla: token_sesion
  ✅ Trigger: calcular recordatorio_2h_antes
  ✅ Vista: métricas por paciente

🎉 Todas las migraciones completadas correctamente
```

> ⚠️ Si alguna tabla ya existe, la migración la omite sin error gracias al `IF NOT EXISTS`.

---

## 6. Ejecutar los seeders

Los seeders insertan **datos de prueba** para que puedas probar el sistema sin tener que capturar información manualmente.

> ⚠️ **Importante:** El seeder hace `TRUNCATE` a todas las tablas antes de insertar. Esto borra cualquier dato existente. Úsalo solo en desarrollo, nunca en producción.

### Datos que se insertan

| Tabla | Registros | Detalle |
|-------|-----------|---------|
| `administrador` | 2 | Admin principal y secundario |
| `medico` | 3 | Medicina General, Cardiología, Geriatría |
| `farmaceutico` | 3 | 2 con permiso de dispensar, 1 sin permiso |
| `paciente` | 5 | Con historial clínico y alergias reales |
| `familiar_cuidador` | 5 | Uno cuida a 2 pacientes distintos |
| `familiar_paciente` | 6 | Relaciones cuidador ↔ paciente |
| `medicamento` | 7 | Losartán, Metformina, Digoxina, etc. |
| `recordatorio` | 9 | Con estatus: pendiente, tomado y omitido |
| `token_sesion` | 2 | Tokens demo con 5 min de vigencia |

### Ejecutar el seeder

```bash
npm run seed
```

### Salida esperada

```
✅ Conexión a MySQL establecida correctamente
🌱 Iniciando seeder...

  🗑️  Tablas limpiadas

  ✅ Administradores insertados
  ✅ Médicos insertados
  ✅ Farmacéuticos insertados
  ✅ Pacientes insertados
  ✅ Familiares/cuidadores insertados
  ✅ Relaciones familiar-paciente insertadas
  ✅ Medicamentos insertados
  ✅ Recordatorios insertados
  ✅ Tokens de sesión demo insertados

🎉 Seeder completado. Datos de prueba listos.
```

---

## 7. Arrancar el servidor

### Modo desarrollo (con auto-reload)

```bash
npm run dev
```

Nodemon reiniciará el servidor automáticamente cada vez que guardes un archivo.

### Modo producción

```bash
npm start
```

### Salida esperada al iniciar

```
✅ Conexión a MySQL establecida correctamente
🌐 Servidor corriendo en http://localhost:3000
📋 Entorno: development

Comandos disponibles:
  npm run dev      → servidor con auto-reload
  npm run migrate  → crear tablas en la BD
  npm run seed     → insertar datos de prueba
```

---

## 8. Comandos de referencia rápida

```bash
npm install        # Instalar dependencias
npm run migrate    # Crear todas las tablas en la BD
npm run seed       # Insertar datos de prueba
npm run dev        # Iniciar servidor en modo desarrollo
npm start          # Iniciar servidor en modo producción
```

### Orden recomendado para configurar el proyecto por primera vez

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Crear tablas
npm run migrate

# 4. Insertar datos de prueba
npm run seed

# 5. Arrancar
npm run dev
```

---

## 9. Solución de errores comunes

### ❌ `Error: connect ECONNREFUSED 127.0.0.1:3306`

MySQL no está corriendo.

**Solución:** Abre XAMPP y asegúrate de que el módulo **MySQL** esté en verde (Start).

---

### ❌ `Access denied for user 'root'@'localhost'`

Las credenciales en `.env` no son correctas.

**Solución:** Verifica que `DB_USER` y `DB_PASSWORD` en tu `.env` coincidan con los de phpMyAdmin. En XAMPP por defecto la contraseña está vacía.

---

### ❌ `Unknown database 'recordatorios_db'`

La base de datos no existe todavía.

**Solución:** Regresa al [paso 2](#2-crear-la-base-de-datos-con-xampp-y-phpmyadmin) y crea la base de datos en phpMyAdmin, luego vuelve a correr `npm run migrate`.

---

### ❌ `Table 'X' doesn't exist` al correr el seeder

Las migraciones no se han ejecutado.

**Solución:**
```bash
npm run migrate
npm run seed
```

---

### ❌ Puerto 3000 ya en uso

**Solución:** Cambia el puerto en tu archivo `.env`:

```env
PORT=3001
```

---

> 📌 Para cualquier duda adicional revisa que XAMPP esté corriendo y que el archivo `.env` tenga los datos correctos antes de ejecutar cualquier comando.