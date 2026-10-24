plugins {
    kotlin("jvm")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.compose")
}

kotlin { jvmToolchain(21) }

sourceSets {
    main { kotlin.srcDir("../../src/adapters/compose/ui") }
}

dependencies {
    implementation(project(":core"))
    implementation(compose.desktop.currentOs)
    implementation(compose.material3)
}
