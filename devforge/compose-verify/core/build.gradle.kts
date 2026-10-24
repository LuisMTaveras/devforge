plugins {
    kotlin("jvm")
}

kotlin { jvmToolchain(21) }

sourceSets {
    main { kotlin.srcDir("../../src/adapters/compose/core") }
}

dependencies {
    api("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    api("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
    // API de Android 4.1 (stub de Maven Central): solo para compilar SharedPreferencesThemeStore.
    compileOnly("com.google.android:android:4.1.1.4")

    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
}

tasks.test {
    useJUnitPlatform()
    // Las pruebas fijan la zona del negocio; la del proceso no debe influir.
    systemProperty("user.timezone", "UTC")
}
