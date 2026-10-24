// Verificación de los módulos Compose de DEVFORGE (src/adapters/compose) en la JVM.
// No es una app: es el «typecheck + tests» de los archivos que instala `devforge add <módulo> --compose`.
//   :core  el núcleo en Kotlin puro (formateadores, fechas, errores, diálogos…) + sus pruebas
//   :ui    los componentes, compilados con Compose Multiplatform (mismas APIs que androidx.compose)
//   :m-*   cada módulo instalado por separado con el paquete reescrito (install-modules.mjs)
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}
dependencyResolutionManagement {
    repositories {
        mavenCentral()
        google()
    }
}
rootProject.name = "devforge-compose-verify"
include("core", "ui")

// Un proyecto por módulo instalado con `node install-modules.mjs` (modules/<módulo>).
file("modules").listFiles()?.filter { it.isDirectory }?.sorted()?.forEach { dir ->
    include(":m-${dir.name}")
    project(":m-${dir.name}").projectDir = dir
}
