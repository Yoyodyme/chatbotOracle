# Guía de Despliegue en OCI — Para Estudiantes
### MyTodoList App · Spring Boot + React · Oracle Cloud Infrastructure

> Esta guía explica **qué hace cada paso y por qué**, no solo los comandos.
> Sigue el orden exacto. No saltes pasos.

---

## ¿Qué vamos a construir?

Al final de esta guía, tu app estará corriendo así en la nube:

```
Internet
   │
   ▼
[IP Pública] ← LoadBalancer (OCI te da esta IP)
   │
   ▼
[Kubernetes] ← Orquesta 2 copias de tu app
   │              para que si una falla, la otra responde
   ├── Pod 1: Tu app Java + React
   └── Pod 2: Tu app Java + React (respaldo)
        │
        ▼
   [Oracle ATP] ← Base de datos en la nube
```

**Terraform** crea toda esa infraestructura automáticamente con un solo comando.

---

## Prerrequisitos

Primero identifica tu sistema operativo y sigue la sección correspondiente.

```
¿Qué sistema tienes?
  Mac       → sección "Mac (Homebrew)"
  Linux     → sección "Linux (Ubuntu/Debian)"
  Windows   → sección "Windows" — lee COMPLETA antes de empezar
```

### Verifica qué ya tienes instalado

**Mac / Linux:**
```bash
oci --version
terraform --version
docker --version
kubectl version --client
java --version    # necesitas Java 17+
mvn --version
```

**Windows (PowerShell):**
```powershell
oci --version
terraform --version
docker --version
kubectl version --client
java --version
mvn --version
```

---

### Mac (Homebrew)

```bash
# Instala todo de una vez
brew install oci-cli terraform kubectl maven
brew install --cask docker   # Docker Desktop

# Verifica
oci --version && terraform --version && docker --version
```

---

### Linux (Ubuntu / Debian)

```bash
# OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Terraform
sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | \
  sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

# kubectl
sudo apt install -y kubectl

# Java 17 + Maven
sudo apt install -y maven openjdk-17-jdk
```

---

### Windows

> **Advertencia importante**: Los scripts de despliegue del proyecto (`build.sh`,
> `deploy.sh`) están escritos en Bash, que no existe nativamente en Windows.
> Tienes dos caminos, elige uno:
>
> - **Camino A (recomendado)**: Instalar WSL2 y trabajar desde Linux dentro de Windows
> - **Camino B**: Instalar todas las herramientas en Windows y ejecutar los comandos manualmente

---

#### Camino A — WSL2 (recomendado para estudiantes)

WSL2 (Windows Subsystem for Linux) instala un Ubuntu real dentro de Windows.
Es la forma más sencilla de tener un entorno compatible con los scripts del proyecto.

**Paso A1 — Instala WSL2**

Abre **PowerShell como Administrador** y ejecuta:

```powershell
wsl --install
```

Esto instala Ubuntu automáticamente. Reinicia la PC cuando termine.

Al reiniciar, Ubuntu abrirá una terminal y te pedirá crear un usuario y contraseña
(son para Ubuntu, no tienen que ver con tu cuenta de Windows).

Verifica que funciona:
```powershell
wsl --list --verbose
# Debe mostrar Ubuntu con STATE: Running
```

**Paso A2 — Instala las herramientas dentro de Ubuntu (WSL)**

Abre la terminal de Ubuntu (busca "Ubuntu" en el menú inicio) y ejecuta:

```bash
# Actualiza el sistema
sudo apt update && sudo apt upgrade -y

# OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
# Acepta todos los defaults con Enter

# Terraform
sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | \
  sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

# kubectl
sudo apt install -y kubectl

# Java 17 + Maven
sudo apt install -y maven openjdk-17-jdk

# Cierra y vuelve a abrir la terminal, luego verifica:
oci --version
terraform --version
java --version
mvn --version
```

**Paso A3 — Docker Desktop con integración WSL2**

Descarga e instala **Docker Desktop para Windows** desde docker.com.

Durante la instalación, asegúrate de activar:
- "Use WSL 2 based engine" ✅
- En Docker Desktop → Settings → Resources → WSL Integration → activa Ubuntu ✅

Desde la terminal de Ubuntu verifica:
```bash
docker --version   # debe funcionar dentro de WSL
```

**Paso A4 — Clona el proyecto dentro de WSL**

> Importante: clona el proyecto DENTRO del sistema de archivos de Ubuntu,
> no en una ruta de Windows (`/mnt/c/...`). Los scripts son mucho más lentos
> si los archivos están en Windows.

```bash
# Dentro de la terminal Ubuntu/WSL:
cd ~
git clone https://github.com/TU_USUARIO/oci_devops_project
cd oci_devops_project/MtdrSpring
```

A partir de aquí, **todos los comandos del resto de la guía los ejecutas
en la terminal de Ubuntu (WSL)**, no en PowerShell ni CMD.

Para abrir el proyecto en VS Code desde WSL:
```bash
code .   # abre VS Code en Windows pero conectado a los archivos de Ubuntu
```

---

#### Camino B — Instalación nativa en Windows

Usa este camino si no puedes instalar WSL2 (por políticas del equipo, etc.).
Requiere instalar cada herramienta individualmente y ejecutar los pasos
del deployment manualmente en lugar de usar los scripts `.sh`.

**Instala con winget (Windows Package Manager)**

Abre **PowerShell como Administrador**:

```powershell
# OCI CLI
winget install Oracle.OCICLi

# Terraform
winget install Hashicorp.Terraform

# Docker Desktop
winget install Docker.DockerDesktop

# kubectl
winget install Kubernetes.kubectl

# Java 17 (Eclipse Temurin — distribución gratuita de Java)
winget install EclipseAdoptium.Temurin.17.JDK

# Maven
winget install Apache.Maven
```

Cierra y vuelve a abrir PowerShell para que los cambios de PATH tengan efecto.

Verifica:
```powershell
oci --version
terraform --version
docker --version
kubectl version --client
java --version
mvn --version
```

> Si `winget` no está disponible en tu Windows, instálalo desde la
> Microsoft Store buscando "App Installer".

**Diferencia clave para el Camino B**

Los scripts `build.sh` y `deploy.sh` no funcionan directamente en Windows.
En lugar de ejecutarlos, debes correr los comandos equivalentes a mano en PowerShell.

Cuando la guía diga `./build.sh`, ejecuta esto en su lugar:

```powershell
# Equivalente a build.sh en PowerShell:
$IMAGE = "$env:DOCKER_REGISTRY/todolistapp-springboot:0.1"

mvn clean package spring-boot:repackage "-DskipTests"
docker build -f Dockerfile -t $IMAGE .
docker push $IMAGE
docker rmi $IMAGE
```

Cuando la guía diga `./deploy.sh`, ejecuta esto:

```powershell
# Equivalente a deploy.sh en PowerShell:
$timestamp = Get-Date -Format "yyyy-MM-dd_HH:mm:ss"
$yaml = "todolistapp-springboot-$timestamp.yaml"

(Get-Content src\main\resources\todolistapp-springboot.yaml) `
  -replace '%DOCKER_REGISTRY%', $env:DOCKER_REGISTRY `
  -replace '%TODO_PDB_NAME%', $env:TODO_PDB_NAME `
  -replace '%OCI_REGION%', $env:OCI_REGION `
  -replace '%UI_USERNAME%', $env:UI_USERNAME `
  | Set-Content $yaml

kubectl apply -f $yaml -n mtdrworkshop
```

Y para definir variables de entorno en PowerShell usa `$env:` en lugar de `export`:

```powershell
# En lugar de:        export DOCKER_REGISTRY="..."
# En PowerShell usa:
$env:DOCKER_REGISTRY = "iad.ocir.io/minamespace/miapp/k1a2b3"
$env:TODO_PDB_NAME   = "miappdb"
$env:OCI_REGION      = "us-ashburn-1"
$env:UI_USERNAME     = "admin"
```

---

#### Resumen: ¿qué camino elegir?

| Criterio | Camino A (WSL2) | Camino B (Nativo) |
|----------|----------------|-------------------|
| Compatibilidad con scripts del proyecto | ✅ Total | ⚠️ Manual |
| Facilidad de setup | Medio | Más pasos |
| Requiere reiniciar | Sí (una vez) | No |
| Recomendado para | La mayoría | Restricciones de TI |
| Experiencia resultante | = Mac/Linux | Diferente a la guía |

**Si tienes dudas, elige el Camino A (WSL2).**

---

## Paso 0 — Clona tu versión del proyecto

```bash
git clone https://github.com/TU_USUARIO/oci_devops_project
cd oci_devops_project/MtdrSpring
```

> **¿Por qué?** Necesitas tener el código en tu máquina para compilarlo
> y construir la imagen Docker.

---

## Paso 1 — Configura OCI CLI

OCI CLI es la herramienta que te permite hablar con Oracle Cloud desde tu terminal.
Para usarla, necesita saber quién eres (tus credenciales).

### 1.1 — Obtén tus datos de OCI

Antes de ejecutar cualquier comando, reúne estos datos desde la consola de OCI
(https://cloud.oracle.com):

| Dato | Dónde encontrarlo en la consola |
|------|---------------------------------|
| **User OCID** | Click en tu avatar (arriba derecha) → User Settings → copia el OCID |
| **Tenancy OCID** | Menú hamburguesa → Governance → Tenancy Details → copia el OCID |
| **Región** | Aparece arriba a la derecha (ej: `us-ashburn-1`, `mx-queretaro-1`) |

Los OCIDs se ven así: `ocid1.user.oc1..aaaaaaaaxxxxxxxxxxx`

### 1.2 — Ejecuta el asistente de configuración

```bash
oci setup config
```

Te va a preguntar paso a paso:
- `Enter a location for your config`: presiona Enter (usa el default `~/.oci/config`)
- `Enter a user OCID`: pega tu User OCID
- `Enter a tenancy OCID`: pega tu Tenancy OCID
- `Enter a region`: escribe tu región (ej: `us-ashburn-1`)
- `Do you want to generate a new API signing RSA key pair?`: escribe `Y`
- El resto: presiona Enter para aceptar los defaults

Esto genera una **API Key** — un par de llaves para identificarte de forma segura.

### 1.3 — Registra tu API Key en OCI

El comando anterior creó una llave pública en `~/.oci/oci_api_key_public.pem`.
Ahora debes decirle a OCI que esa llave es tuya:

```bash
# Muestra tu llave pública (copia TODO el contenido)
cat ~/.oci/oci_api_key_public.pem
```

En la consola de OCI:
1. Click en tu avatar → **User Settings**
2. En el menú izquierdo: **API Keys** → **Add API Key**
3. Selecciona **Paste a public key**
4. Pega el contenido que copiaste
5. Click **Add**

OCI te mostrará un `fingerprint` — verifica que coincide con el que está en `~/.oci/config`.

### 1.4 — Verifica que funciona

```bash
oci iam user get --user-id <TU_USER_OCID>
```

Si devuelve un JSON con tu información, ¡funciona! Si da error, revisa el paso anterior.

---

## Paso 2 — Crea la infraestructura con Terraform

> **¿Qué es Terraform?**
> Es una herramienta que lee archivos de configuración y crea recursos en la nube
> automáticamente. En lugar de hacer click en la consola de OCI 20 veces,
> Terraform lo hace todo solo con un comando.

### 2.1 — Entiende qué va a crear

El Terraform de este proyecto crea:
- **VCN**: la red privada virtual donde vive todo (como el WiFi de tu casa, pero en la nube)
- **Subnets**: divisiones de esa red (una para la app, una para la BD, una para el balanceador)
- **OKE**: el clúster de Kubernetes (3 servidores que corren tu app)
- **ATP**: la base de datos Oracle (administrada, se cuida sola)
- **OCIR**: el registro donde guardas tu imagen Docker
- **Object Storage**: un bucket (como Google Drive) para guardar archivos de configuración

### 2.2 — Crea el compartment (opcional pero recomendado)

Un **compartment** es una carpeta lógica en OCI para organizar tus recursos.
En la consola de OCI: Menú → Identity & Security → Compartments → Create Compartment

O usa el compartment raíz (root) de tu tenancy si no quieres crear uno nuevo.
Copia el OCID del compartment que uses.

### 2.3 — Configura las variables de Terraform

```bash
cd oci_devops_project/MtdrSpring/terraform
```

Crea el archivo de variables (reemplaza los valores con los tuyos):

```bash
cat > terraform.tfvars << 'EOF'
ociTenancyOcid      = "ocid1.tenancy.oc1..XXXXXXXX"
ociUserOcid         = "ocid1.user.oc1..XXXXXXXX"
ociCompartmentOcid  = "ocid1.compartment.oc1..XXXXXXXX"
ociRegionIdentifier = "us-ashburn-1"
runName             = "miapp"
mtdrDbName          = "miappdb"
mtdrKey             = "k1a2b3"
EOF
```

> **Reglas para los valores:**
> - `runName`: solo letras y números, máximo 13 caracteres, debe empezar con letra, todo minúsculas (ej: `miapp`, `juanapp`)
> - `mtdrDbName`: nombre de tu base de datos, sin espacios (ej: `miappdb`)
> - `mtdrKey`: una clave corta y única para evitar conflictos de nombres (ej: `k1a2b3`, invéntala tú)

### 2.4 — Inicializa y aplica Terraform

```bash
# Descarga los plugins necesarios de OCI (solo se hace una vez)
terraform init

# Muestra qué va a crear SIN crearlo todavía (buena práctica revisarlo)
terraform plan

# Crea todo en OCI (tarda entre 20 y 30 minutos)
terraform apply -auto-approve
```

Verás mucho output. Al final debe decir algo como:
```
Apply complete! Resources: 12 added, 0 changed, 0 destroyed.

Outputs:
lab_oke_cluster_id = "ocid1.cluster.oc1.iad.XXXXXXXX"
```

**Copia ese `lab_oke_cluster_id`** — lo necesitas en el siguiente paso.

> **¿Por qué tarda tanto?**
> Crear una base de datos Oracle y un clúster de Kubernetes en la nube requiere
> aprovisionar servidores físicos. Es normal que tome 20-30 minutos.

---

## Paso 3 — Conecta kubectl a tu clúster de Kubernetes

> **¿Qué es kubectl?**
> Es la herramienta de línea de comandos para controlar Kubernetes.
> Kubernetes es el sistema que mantiene tu app corriendo en varios servidores.
> `kubectl` es como el control remoto de ese sistema.

Ahora tienes un clúster creado en OCI, pero tu máquina no sabe cómo hablarle.
Este paso crea esa conexión.

```bash
# Reemplaza <OCID_CLUSTER> con el valor que copiaste al final del terraform apply
# Reemplaza <TU_REGION> con tu región (ej: us-ashburn-1)
oci ce cluster create-kubeconfig \
  --cluster-id <OCID_CLUSTER> \
  --file ~/.kube/config \
  --region <TU_REGION> \
  --token-version 2.0.0

# Verifica que funciona (debe mostrar 3 nodos en estado Ready)
kubectl get nodes
```

El resultado debe verse así:
```
NAME          STATUS   ROLES   AGE   VERSION
10.0.10.2     Ready    <none>  5m    v1.35.0
10.0.10.3     Ready    <none>  5m    v1.35.0
10.0.10.4     Ready    <none>  5m    v1.35.0
```

Si dice `NotReady`, espera 2-3 minutos y vuelve a intentar.

---

## Paso 4 — Crea el namespace en Kubernetes

Un **namespace** en Kubernetes es como una carpeta — sirve para separar los recursos
de diferentes aplicaciones en el mismo clúster.

```bash
kubectl create namespace mtdrworkshop

# Verifica
kubectl get namespaces
```

---

## Paso 5 — Configura la base de datos

### 5.1 — Obtén el OCID de tu base de datos ATP

```bash
# Muestra las bases de datos en tu compartment
oci db autonomous-database list \
  --compartment-id <TU_COMPARTMENT_OCID> \
  --query 'data[].{name:"db-name", id:id}' \
  --output table
```

Copia el `id` de tu base de datos.

### 5.2 — Descarga el Wallet de conexión

> **¿Qué es el Wallet?**
> Oracle no deja conectarse a la base de datos con solo usuario y contraseña.
> El Wallet es un conjunto de certificados y archivos de configuración que
> garantizan que la conexión es segura y cifrada. Sin él, tu app no puede
> conectarse a la BD.

```bash
# Crea una carpeta para el wallet
mkdir -p ~/wallet

# Descarga el wallet (inventa una contraseña para el wallet, no es la de la BD)
oci db autonomous-database generate-wallet \
  --autonomous-database-id <OCID_ATP> \
  --password "WalletPass123!" \
  --file ~/wallet/wallet.zip

# Descomprime
unzip ~/wallet/wallet.zip -d ~/wallet/
ls ~/wallet/
```

Debes ver archivos como: `cwallet.sso`, `tnsnames.ora`, `sqlnet.ora`, `keystore.jks`, etc.

### 5.3 — Crea el usuario y la tabla en la base de datos

Primero necesitas la contraseña del administrador de tu ATP.
Puedes restablecerla en OCI Console → Autonomous Database → tu BD → More Actions → Administrator Password.

Conéctate a la BD:
```bash
# Usando SQL*Plus (si está instalado)
export TNS_ADMIN=~/wallet
sqlplus ADMIN/<PASSWORD_ADMIN>@<mtdrDbName>_tp
```

Si no tienes SQL*Plus, usa **SQLcl** (más fácil de instalar):
```bash
# Mac
brew install sqlcl

# Conéctate
sql ADMIN/<PASSWORD_ADMIN>@<mtdrDbName>_tp
```

Una vez conectado, ejecuta estas sentencias SQL:
```sql
-- Crea el usuario de la aplicación
CREATE USER TODOUSER IDENTIFIED BY "TodoPass123!";
GRANT CONNECT, RESOURCE, UNLIMITED TABLESPACE TO TODOUSER;

-- Cambia al usuario recién creado
ALTER SESSION SET CURRENT_SCHEMA = TODOUSER;

-- Crea la tabla de tareas
CREATE TABLE TODOUSER.TODOITEM (
  ID          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  DESCRIPTION VARCHAR2(4000),
  CREATION_TS TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  DONE        NUMBER(1) DEFAULT 0 NOT NULL
);

-- Verifica
SELECT * FROM TODOUSER.TODOITEM;

EXIT;
```

### 5.4 — Crea los Secrets de Kubernetes

> **¿Qué son los Secrets?**
> Kubernetes tiene un mecanismo para guardar información sensible (contraseñas,
> certificados) de forma separada al código. Se llaman "Secrets". Tu app los lee
> automáticamente como variables de entorno, sin que la contraseña quede
> escrita en ningún archivo de código.

```bash
# Secret 1: El wallet de la base de datos
# (los archivos del wallet se montan dentro del contenedor de la app)
kubectl create secret generic db-wallet-secret \
  --from-file=~/wallet/ \
  --namespace mtdrworkshop

# Secret 2: La contraseña de la base de datos para la app
# (usa la contraseña del TODOUSER que creaste en el paso anterior)
kubectl create secret generic dbuser \
  --from-literal=dbpassword="TodoPass123!" \
  --namespace mtdrworkshop

# Secret 3: Credenciales para el login de la interfaz web
kubectl create secret generic frontendadmin \
  --from-literal=password="MiPasswordUI123!" \
  --namespace mtdrworkshop

# Verifica que los tres secrets existen
kubectl get secrets -n mtdrworkshop
```

---

## Paso 5.5 — Configura el bot de Telegram

> **¿Por qué ahora y no después?**
> La app incluye un bot de Telegram integrado. Si no configuras el token
> antes de construir la imagen Docker, la app **no arrancará** en Kubernetes.
> Este paso es obligatorio aunque no pienses usar el bot activamente.

### 5.5.1 — Crea tu bot con BotFather

1. Abre Telegram y busca **@BotFather**
2. Envía el comando `/newbot`
3. BotFather te pedirá:
   - **Nombre del bot**: el nombre visible (ej: `Mi Todo List`)
   - **Username del bot**: debe terminar en `bot` (ej: `mitodolist_bot`)
4. BotFather te responde con tu **token**, algo así:
   ```
   1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. **Copia ese token** — lo necesitas en el siguiente paso

### 5.5.2 — Agrega el token al proyecto

Abre el archivo `backend/src/main/resources/application.properties` y descomenta estas dos líneas reemplazando los valores:

```properties
# ANTES (comentado):
#telegram.bot.token=<token>
#telegram.bot.name=<bot_name>

# DESPUÉS (activo con tus datos):
telegram.bot.token=1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
telegram.bot.name=mitodolist_bot
```

> **Importante:** El `bot_name` debe ser el username que elegiste (sin @),
> no el nombre visible. Si tu bot se llama "Mi Todo List" pero el username
> es `mitodolist_bot`, escribe `mitodolist_bot`.

### 5.5.3 — Verifica que el token funciona (opcional pero recomendado)

```bash
# Reemplaza <TOKEN> con tu token real
curl https://api.telegram.org/bot<TOKEN>/getMe
```

Si el token es válido verás un JSON con la información de tu bot:
```json
{
  "ok": true,
  "result": {
    "id": 1234567890,
    "username": "mitodolist_bot",
    "first_name": "Mi Todo List"
  }
}
```

Si ves `{"ok":false}` el token es incorrecto — vuelve a copiarlo desde BotFather.

---

## Paso 6 — Construye y sube la imagen Docker

> **¿Qué es Docker y una imagen?**
> Docker empaqueta tu app (el JAR de Java + todas sus dependencias) en una
> "imagen" — como una fotografía del sistema listo para correr. Kubernetes
> descarga esa imagen y la ejecuta en cada uno de sus servidores.
> El OCIR (Oracle Container Image Registry) es donde guardas esa imagen,
> como un "GitHub pero para imágenes Docker".

### 6.1 — Genera un Auth Token para Docker

El Auth Token es la contraseña que Docker usa para subir imágenes al OCIR de OCI.

En OCI Console:
1. Click en tu avatar → **User Settings**
2. En el menú izquierdo: **Auth Tokens** → **Generate Token**
3. Descripción: `docker-push` (o lo que quieras)
4. **Copia el token inmediatamente** — OCI no lo muestra de nuevo

### 6.2 — Obtén el Namespace de Object Storage

```bash
oci os ns get --query 'data' --raw-output
```

Guarda ese valor — lo necesitas para el login de Docker.

### 6.3 — Login al registro de OCI

```bash
# Formato: <REGION>.ocir.io
# Ejemplo de región: us-ashburn-1 → iad.ocir.io
#                    mx-queretaro-1 → qro.ocir.io

docker login <REGION>.ocir.io \
  -u "<NAMESPACE>/<TU_EMAIL_OCI>"
# Te pedirá la contraseña: pega tu Auth Token
```

### 6.4 — Define la ruta de tu imagen

```bash
# Esta variable le dice a los scripts dónde subir y descargar la imagen
export DOCKER_REGISTRY="<REGION>.ocir.io/<NAMESPACE>/<runName>/<mtdrKey>"

# Ejemplo:
# export DOCKER_REGISTRY="iad.ocir.io/mytenancy/miapp/k1a2b3"
```

### 6.5 — Compila y sube la imagen

```bash
cd oci_devops_project/MtdrSpring/backend

# Compila el proyecto Java (genera el archivo .jar)
mvn clean package spring-boot:repackage -DskipTests

# Construye la imagen Docker y la sube al OCIR
# (esto puede tardar 3-5 minutos la primera vez)
chmod +x build.sh
./build.sh
```

> **¿Qué hace build.sh?**
> 1. Toma el JAR que compiló Maven
> 2. Lo mete dentro de una imagen Docker con Java pre-instalado
> 3. Sube (push) esa imagen al OCIR de OCI
> 4. Borra la copia local para ahorrar espacio en disco

---

## Paso 7 — Despliega la app en Kubernetes

Ya tienes:
- ✅ Infraestructura creada (Terraform)
- ✅ Base de datos configurada con usuario y tabla
- ✅ Secrets de Kubernetes creados
- ✅ Imagen Docker subida al OCIR

Ahora dices a Kubernetes: "descarga esa imagen y córrela".

### 7.1 — Configura las variables de entorno

```bash
# La ruta de tu imagen (ya la definiste antes, pero asegúrate que esté activa)
export DOCKER_REGISTRY="<REGION>.ocir.io/<NAMESPACE>/<runName>/<mtdrKey>"

# El nombre de tu base de datos ATP (el valor de mtdrDbName en terraform.tfvars)
export TODO_PDB_NAME="miappdb"

# Tu región de OCI
export OCI_REGION="us-ashburn-1"

# El nombre de usuario para el login de la web
export UI_USERNAME="admin"
```

### 7.2 — Despliega

```bash
cd oci_devops_project/MtdrSpring/backend
chmod +x deploy.sh
./deploy.sh
```

> **¿Qué hace deploy.sh?**
> Toma el archivo `todolistapp-springboot.yaml` (que es como la "receta" para
> Kubernetes), reemplaza los valores entre `%PORCENTAJES%` con tus variables
> de entorno, y le dice a Kubernetes "crea esto".

### 7.3 — Verifica el despliegue

```bash
# Mira si los pods (las instancias de tu app) están corriendo
kubectl get pods -n mtdrworkshop

# Resultado esperado (puede tardar 1-2 minutos en llegar a Running):
# NAME                                          READY   STATUS    RESTARTS
# todolistapp-springboot-deployment-xxxxx-yyy   1/1     Running   0
# todolistapp-springboot-deployment-xxxxx-zzz   1/1     Running   0
```

Si el STATUS dice `ImagePullBackOff`, el clúster no puede descargar la imagen.
Revisa el paso 6 (login de Docker y DOCKER_REGISTRY).

Si dice `CrashLoopBackOff`, la app arrancó pero falló. Revisa los logs:
```bash
kubectl logs <NOMBRE_DEL_POD> -n mtdrworkshop
```

---

## Paso 8 — Obtén la URL de tu app

```bash
# Muestra los servicios y su IP pública
kubectl get svc -n mtdrworkshop
```

Resultado esperado:
```
NAME                              TYPE           CLUSTER-IP    EXTERNAL-IP     PORT(S)
todolistapp-springboot-service    LoadBalancer   10.96.x.x     <PENDING>       80:xxxxx/TCP
```

La columna `EXTERNAL-IP` puede decir `<PENDING>` durante 2-3 minutos mientras OCI asigna la IP.
Ejecuta el comando de nuevo hasta que aparezca una IP.

```bash
# Cuando aparezca la IP, tu app está en:
http://<EXTERNAL-IP>
```

**¡Abre esa URL en tu navegador y ya deberías ver tu To-Do List funcionando!**

---

## Hibernate — cómo funciona la base de datos sin escribir SQL

> Esta sección es importante antes de extender el proyecto.
> Si vienes de Node.js, ya conoces este concepto con otro nombre.

### ¿Qué es Hibernate?

En Node.js probablemente usaste **Sequelize**, **Prisma** o **TypeORM**.
Hibernate es exactamente lo mismo pero para Java: un **ORM** (Object-Relational Mapper).

La idea es la misma en todos:

```
Node.js (Sequelize/Prisma)          Java (Hibernate)
──────────────────────────          ────────────────
defineModel('User', {               @Entity
  name: DataTypes.STRING,           @Table(name = "USERS")
  email: DataTypes.STRING           public class User {
})                                      String name;
                                        String email;
                                    }
```

Defines tu tabla como una **clase**, no como SQL. El ORM traduce eso a la base de datos.

### La línea más importante del proyecto

En [application.properties](oci_devops_project/MtdrSpring/backend/src/main/resources/application.properties):

```properties
spring.jpa.hibernate.ddl-auto=update
```

Esto le dice a Hibernate: **"cuando arranque la app, compara las clases Java con las
tablas en Oracle y crea o actualiza lo que falte"**.

| Valor de ddl-auto | Comportamiento |
|-------------------|---------------|
| `update` | Crea tablas nuevas, agrega columnas faltantes. **Nunca borra datos.** |
| `create` | Borra y recrea todo al arrancar. Útil en desarrollo, peligroso en producción. |
| `validate` | Solo verifica que las tablas coincidan. Falla si hay diferencias. |
| `none` | No hace nada. Tú manejas el esquema manualmente. |

### ¿Qué significa para ti como estudiante?

**No necesitas escribir SQL para crear tablas nuevas.**

Si agregas una clase Java con `@Entity`, la tabla aparece sola la próxima vez que
despliegues. Si agregas un campo a una clase existente, la columna aparece sola.

Esto es lo mismo que en Prisma cuando corres `prisma migrate dev` —
solo que aquí es automático en cada arranque.

### Cómo está mapeada una entidad en este proyecto

```java
// ToDoItem.java — la clase Java
@Entity                          // ← "esto es una tabla"
@Table(name = "TODOITEM")        // ← nombre exacto de la tabla en Oracle
public class ToDoItem {

    @Id                                              // ← clave primaria
    @GeneratedValue(strategy = GenerationType.IDENTITY) // ← autoincremental
    int ID;

    @Column(name = "DESCRIPTION")  // ← columna en la tabla
    String description;

    @Column(name = "CREATION_TS")
    OffsetDateTime creation_ts;    // ← Hibernate sabe mapear esto a TIMESTAMP

    @Column(name = "done")
    boolean done;                  // ← Hibernate lo guarda como 0 o 1 en Oracle
}
```

Equivalente en Prisma sería:

```prisma
model TodoItem {
  id          Int      @id @default(autoincrement())
  description String?
  creation_ts DateTime @default(now())
  done        Boolean  @default(false)
}
```

La idea es idéntica. Solo cambia la sintaxis.

---

## Cómo extender el proyecto

Una vez que tienes la app desplegada, puedes agregar features siguiendo
siempre el mismo patrón de 3 archivos: **Entidad → Repository → Controller**.

### Extensión A — Agregar una tabla nueva (ej: Categorías)

**Archivo 1 de 3: La entidad (define la tabla)**

Crea `src/main/java/com/springboot/MyTodoList/model/Category.java`:

```java
package com.springboot.MyTodoList.model;

import jakarta.persistence.*;

@Entity
@Table(name = "CATEGORY")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int ID;

    @Column(name = "NAME")
    String name;

    @Column(name = "COLOR")   // ej: "#FF5733"
    String color;

    public Category() {}

    public int getID() { return ID; }
    public void setID(int ID) { this.ID = ID; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
```

> Hibernate crea la tabla `CATEGORY` con columnas `ID`, `NAME` y `COLOR`
> automáticamente en el próximo despliegue. Sin SQL, sin Terraform.

---

**Archivo 2 de 3: El Repository (acceso a datos)**

Crea `src/main/java/com/springboot/MyTodoList/repository/CategoryRepository.java`:

```java
package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import jakarta.transaction.Transactional;

@Repository
@Transactional
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    // No necesitas escribir nada aquí.
    // JpaRepository te da gratis: findAll(), findById(), save(), deleteById()
}
```

> En Node.js esto equivale al modelo de Mongoose o al PrismaClient —
> te da las operaciones CRUD sin que tengas que escribirlas.

---

**Archivo 3 de 3: El Controller (los endpoints de la API)**

Crea `src/main/java/com/springboot/MyTodoList/controller/CategoryController.java`:

```java
package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Category;
import com.springboot.MyTodoList.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    // GET /categories → devuelve todas las categorías
    @GetMapping("/categories")
    public List<Category> getAll() {
        return categoryRepository.findAll();
    }

    // GET /categories/1 → devuelve una categoría por ID
    @GetMapping("/categories/{id}")
    public ResponseEntity<Category> getById(@PathVariable int id) {
        return categoryRepository.findById(id)
            .map(c -> new ResponseEntity<>(c, HttpStatus.OK))
            .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    // POST /categories → crea una categoría nueva
    @PostMapping("/categories")
    public Category create(@RequestBody Category category) {
        return categoryRepository.save(category);
    }

    // DELETE /categories/1 → elimina una categoría
    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        categoryRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
```

Con esos 3 archivos tienes una API REST completa para categorías. Sin tocar nada más.

---

### Extensión B — Relacionar dos tablas (categoría → tarea)

Si quieres que cada tarea pertenezca a una categoría, agrega esto en `ToDoItem.java`:

```java
// Agregar este import al inicio del archivo:
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;

// Agregar este campo dentro de la clase ToDoItem:
@ManyToOne
@JoinColumn(name = "CATEGORY_ID")   // ← crea la columna FK en la tabla TODOITEM
private Category category;

// Y sus getter/setter:
public Category getCategory() { return category; }
public void setCategory(Category category) { this.category = category; }
```

Hibernate agrega sola la columna `CATEGORY_ID` como foreign key en `TODOITEM`.

La respuesta del API de tareas ahora incluirá el objeto completo de la categoría:

```json
{
  "ID": 1,
  "description": "Hacer tarea",
  "done": false,
  "category": {
    "ID": 2,
    "name": "Universidad",
    "color": "#3498DB"
  }
}
```

---

### Extensión C — Agregar una pantalla en React

El frontend está en `backend/src/main/frontend/src/`.
El patrón es el mismo que cualquier app React: componente + fetch a la API.

Crea `src/main/frontend/src/components/CategoryList.tsx`:

```tsx
import { useEffect, useState } from 'react';

interface Category {
  ID: number;
  name: string;
  color: string;
}

const CategoryList = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    // La app sirve frontend y backend en el mismo servidor,
    // por eso la URL es relativa (sin dominio)
    fetch('/categories')
      .then(res => res.json())
      .then(data => setCategories(data));
  }, []);

  return (
    <div>
      <h2>Categorías</h2>
      {categories.map(cat => (
        <div key={cat.ID} style={{ borderLeft: `4px solid ${cat.color}`, padding: '8px' }}>
          {cat.name}
        </div>
      ))}
    </div>
  );
};

export default CategoryList;
```

Luego agrégalo en tu router o en la pantalla principal.

---

### Cómo ver tus cambios en producción

Cada vez que modifiques código y quieras verlo en la nube, sigue estos 3 pasos:

```bash
# Paso 1: Compila el proyecto (Java + React juntos)
cd oci_devops_project/MtdrSpring/backend
mvn clean package spring-boot:repackage -DskipTests

# Paso 2: Construye y sube la nueva imagen Docker al OCIR
./build.sh

# Paso 3: Dile a Kubernetes que use la nueva imagen
# (hace el cambio sin apagar la app — los pods se reemplazan uno a uno)
kubectl rollout restart deployment/todolistapp-springboot-deployment -n mtdrworkshop

# Opcional: observa cómo va el reemplazo en tiempo real
kubectl rollout status deployment/todolistapp-springboot-deployment -n mtdrworkshop
```

Kubernetes hace el update **sin tiempo de inactividad**: arranca pods nuevos
antes de apagar los viejos. Tu app nunca deja de responder durante el deploy.

---

### Resumen: ¿qué tocar para cada tipo de cambio?

| Quiero... | Solo toco... |
|-----------|-------------|
| Agregar tabla nueva | 3 archivos Java: entidad, repository, controller |
| Agregar columna a tabla existente | 1 línea en la entidad Java con `@Column` |
| Relacionar dos tablas | 1 campo con `@ManyToOne` en la entidad |
| Nuevo endpoint en la API | 1 método en el controller existente |
| Nueva pantalla en React | 1 componente nuevo en `frontend/src/` |
| Más servidores / más memoria | Archivos en `terraform/` |
| Más réplicas de la app | Cambiar `replicas: 2` en `todolistapp-springboot.yaml` |

---

## Resumen de variables importantes

Guarda estas variables en un lugar seguro — las necesitarás varias veces:

```bash
# === MIS DATOS OCI ===
export TENANCY_OCID="ocid1.tenancy.oc1..XXXXXXXX"
export USER_OCID="ocid1.user.oc1..XXXXXXXX"
export COMPARTMENT_OCID="ocid1.compartment.oc1..XXXXXXXX"
export OCI_REGION="us-ashburn-1"

# === DATOS DE MI DESPLIEGUE ===
export RUN_NAME="miapp"
export MTDR_DB_NAME="miappdb"
export MTDR_KEY="k1a2b3"
export OKE_CLUSTER_ID="ocid1.cluster.oc1..XXXXXXXX"
export NAMESPACE="<namespace_de_object_storage>"
export DOCKER_REGISTRY="${OCI_REGION}.ocir.io/${NAMESPACE}/${RUN_NAME}/${MTDR_KEY}"
export TODO_PDB_NAME="${MTDR_DB_NAME}"
export UI_USERNAME="admin"
```

---

## Errores comunes y soluciones

| Error | Causa probable | Solución |
|-------|---------------|----------|
| `oci: command not found` | OCI CLI no instalado o no en el PATH | Reinstala OCI CLI y abre una nueva terminal |
| `401 Unauthorized` al hacer docker push | Auth Token incorrecto o expirado | Genera uno nuevo en OCI Console |
| `ImagePullBackOff` en kubectl | Kubernetes no puede descargar la imagen | Verifica DOCKER_REGISTRY y que hiciste docker login |
| `CrashLoopBackOff` en kubectl | La app falla al arrancar | Revisa logs con `kubectl logs <pod> -n mtdrworkshop` |
| `terraform apply` falla con 403 | Tu usuario no tiene permisos suficientes | Pide al administrador del tenancy que te dé permisos |
| `ORA-01017` en la BD | Contraseña incorrecta | Verifica el secret `dbuser` en Kubernetes |
| Los pods están en `Pending` | No hay recursos en el clúster | Verifica que los 3 nodos estén en `Ready` con `kubectl get nodes` |

---

## Gestión de costos

Antes de hablar de limpieza, entiende qué cuesta y qué no en este proyecto.

### ¿Qué es gratis y qué cuesta dinero?

| Componente | ¿Cuesta? | Por qué |
|------------|----------|---------|
| ATP (Base de datos) | Gratis | OCI Always Free: 1 BD ATP incluida |
| Object Storage | Gratis | OCI Always Free: hasta 20GB |
| VCN + Networking | Gratis | La red virtual no tiene costo |
| OKE (el clúster) | Gratis | El orquestador en sí es gratis |
| Load Balancer | Gratis | OCI incluye 1 flexible load balancer |
| OCIR (imágenes Docker) | Gratis | Hasta 500MB de almacenamiento |
| **Nodos de Kubernetes** | **PAGADO** | Son 3 servidores virtuales corriendo 24/7 |

El único costo real son los 3 nodos VM.Standard.E3.Flex del clúster:

```
3 nodos × 2 OCPUs  × $0.025/hora = $0.15/hora
3 nodos × 6GB RAM  × $0.0015/hora = $0.027/hora
──────────────────────────────────────────────
Por hora:  ~$0.18 USD
Por día:   ~$4.30 USD
Por mes:   ~$130 USD
```

### El Free Trial de OCI — tu mejor aliado

Toda cuenta nueva de OCI recibe **$300 USD en créditos gratuitos** válidos por 30 días.
Para un ejercicio de clase eso es más que suficiente.

> Regístrate en oracle.com/cloud/free — no requiere tarjeta de crédito
> para el tier Always Free, pero sí para activar los $300 de crédito.

### Regla de oro: destruye cuando no uses

Los recursos cobran por cada hora que están encendidos, uses la app o no.
Al terminar cada sesión de trabajo:

```bash
cd oci_devops_project/MtdrSpring/terraform

# Apaga y elimina todo (costo = $0 mientras esté destruido)
terraform destroy -auto-approve
```

Para retomar el trabajo:

```bash
# Recrea toda la infraestructura (~25 minutos)
terraform apply -auto-approve

# Vuelve a conectar kubectl
oci ce cluster create-kubeconfig \
  --cluster-id <NUEVO_OCID_CLUSTER> \
  --file ~/.kube/config \
  --region <TU_REGION> \
  --token-version 2.0.0

# Vuelve a crear los secrets (se pierden al destruir)
kubectl create namespace mtdrworkshop
kubectl create secret generic db-wallet-secret --from-file=~/wallet/ -n mtdrworkshop
kubectl create secret generic dbuser --from-literal=dbpassword="TodoPass123!" -n mtdrworkshop
kubectl create secret generic frontendadmin --from-literal=password="MiPasswordUI123!" -n mtdrworkshop

# Redespliega la app (la imagen ya está en OCIR, no hay que rebuildar)
./deploy.sh
```

> **Nota:** La imagen Docker en OCIR **no se elimina** con `terraform destroy`.
> Solo se destruye la infraestructura de cómputo y red. No necesitas hacer
> `build.sh` de nuevo, solo `deploy.sh`.

### ¿Cuánto dura el Free Trial con este proyecto?

Si destruyes los recursos cuando no los usas (por ejemplo, solo los tienes activos
durante clases y prácticas):

| Horas activo por día | Costo diario | Días que duran los $300 |
|----------------------|-------------|------------------------|
| 24 horas (siempre activo) | ~$4.30 | ~69 días |
| 8 horas (solo en horario de clase) | ~$1.44 | ~208 días |
| 3 horas (solo para entregar) | ~$0.54 | ~555 días |

Con un uso razonable, los $300 alcanzan todo el semestre.

### Alternativa sin costo: nodos ARM Always Free

OCI incluye instancias ARM (Ampere A1) **gratis para siempre**:
4 OCPUs + 24GB RAM que puedes usar como nodos de Kubernetes.

Para usarlas, cambia en `terraform/containerengine.tf` el shape de los nodos:

```hcl
# Reemplaza esto:
shape = "VM.Standard.E3.Flex"

# Por esto:
shape = "VM.Standard.A1.Flex"
```

**Tradeoff:** Las imágenes Docker deben compilarse para arquitectura ARM.
Agrega `--platform linux/arm64` al comando de build:

```bash
docker build --platform linux/arm64 -f Dockerfile -t $IMAGE .
```

Si tu Mac tiene chip M1/M2/M3, esto funciona nativamente.
En Intel necesitas habilitar buildx en Docker Desktop.

---

## Limpieza — Elimina todos los recursos cuando ya no los necesites

> **Importante**: OCI cobra por los recursos mientras están activos.
> Cuando termines de usar la app, elimina todo para evitar cargos.

```bash
cd oci_devops_project/MtdrSpring/terraform

# Esto elimina TODO lo que Terraform creó (BD, Kubernetes, red, etc.)
# La imagen en OCIR NO se elimina — solo la infraestructura
terraform destroy -auto-approve
```

Verifica que todo se eliminó en la consola de OCI:
- Menú → Developer Services → Kubernetes Clusters → debe estar vacío
- Menú → Oracle Database → Autonomous Database → debe estar vacío

---

*Guía preparada para el curso · Basada en el proyecto oci_devops_project*