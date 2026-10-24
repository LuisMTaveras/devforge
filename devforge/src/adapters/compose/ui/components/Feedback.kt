package devforge.ui.components

/**
 * ⚡ DEVFORGE ConfirmDialogHost + ToastHost (Compose) — van UNA vez en la raíz, encima de todo:
 *
 *   DevforgeTheme {
 *       Box(Modifier.fillMaxSize()) {
 *           AppNavHost()
 *           ToastHost()
 *           ConfirmDialogHost()
 *       }
 *   }
 *
 * Se abren desde cualquier sitio: `confirmDialog(…)`, `promptDialog(…)`, `alertDialog(…)` y
 * `notify(…)` (`core/feedback`). El TIPO decide icono y color; `DialogTone.DANGER` pinta
 * destructivo; el LARGO del mensaje decide ancho y alineación. Atrás cancela, Enter confirma.
 * En una pregunta destructiva el foco empieza en «Cancelar».
 */

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isCtrlPressed
import androidx.compose.ui.input.key.isMetaPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import devforge.core.feedback.DialogCenter
import devforge.core.feedback.DialogTone
import devforge.core.feedback.DialogType
import devforge.core.feedback.ToastCenter
import devforge.core.feedback.ToastType
import devforge.core.feedback.isLongDialogMessage
import devforge.ui.theme.DevforgeTheme
import kotlinx.coroutines.delay

@Composable
fun ConfirmDialogHost() {
    val state by DialogCenter.state.collectAsState()
    if (!state.open) return
    val colors = DevforgeTheme.colors
    val type = DevforgeTheme.type
    val long = isLongDialogMessage(state.message)
    val danger = state.tone == DialogTone.DANGER
    val (icon, iconTint) = when {
        danger -> DfIconName.WARNING to colors.danger
        state.type == DialogType.SUCCESS -> DfIconName.SUCCESS to colors.success
        state.type == DialogType.WARNING -> DfIconName.WARNING to colors.warning
        state.type == DialogType.ERROR -> DfIconName.ERROR to colors.danger
        state.type == DialogType.CONFIRM -> DfIconName.HELP to colors.mutedForeground
        state.type == DialogType.PROMPT -> DfIconName.EDIT to colors.mutedForeground
        else -> DfIconName.INFO to colors.mutedForeground
    }
    val confirmVariant = when {
        danger || state.type == DialogType.ERROR -> DfButtonVariant.DANGER
        state.hasCancel -> DfButtonVariant.PRIMARY
        else -> DfButtonVariant.SECONDARY // un aviso sin alternativa no necesita un botón que grite
    }
    val cancelFocus = remember { FocusRequester() }
    val inputFocus = remember { FocusRequester() }
    var cancelFocused by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = DialogCenter::cancel, properties = ShellDialogProperties) {
        Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
            Column(
                Modifier
                    .widthIn(max = if (long) 512.dp else 384.dp)
                    .fillMaxWidth()
                    .background(colors.surfaceRaised, DevforgeTheme.shapes.card)
                    .border(BorderStroke(1.dp, colors.border), DevforgeTheme.shapes.card)
                    .onPreviewKeyEvent { e ->
                        val enter = e.type == KeyEventType.KeyDown && (e.key == Key.Enter || e.key == Key.NumPadEnter)
                        // En un campo de varias líneas, Enter es salto de línea: confirma Ctrl/Cmd+Enter.
                        // Enter sobre «Cancelar» cancela (lo hace el propio botón), nunca confirma.
                        if (enter && !cancelFocused && (!state.inputMultiline || e.isCtrlPressed || e.isMetaPressed)) {
                            DialogCenter.accept()
                            true
                        } else {
                            false
                        }
                    },
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = if (long) Alignment.Start else Alignment.CenterHorizontally,
                ) {
                    DfIcon(icon, size = 36.dp, tint = iconTint, modifier = Modifier.padding(bottom = 12.dp))
                    Text(
                        state.title,
                        style = type.title,
                        color = colors.foreground,
                        textAlign = if (long) TextAlign.Start else TextAlign.Center,
                        modifier = Modifier.padding(bottom = 8.dp).semantics { heading() },
                    )
                    if (state.message.isNotEmpty()) {
                        Text(
                            state.message,
                            style = type.small.copy(lineHeight = type.small.fontSize * 1.6),
                            color = colors.mutedForeground,
                            textAlign = if (long) TextAlign.Start else TextAlign.Center,
                        )
                    }
                    if (state.type == DialogType.PROMPT) {
                        val interaction = remember { MutableInteractionSource() }
                        FieldFrame(
                            modifier = Modifier.padding(top = 16.dp),
                            invalid = state.inputError.isNotEmpty(),
                            interactionSource = interaction,
                            supportingText = state.inputError.ifEmpty { null },
                        ) {
                            Box(Modifier.padding(vertical = 10.dp)) {
                                if (state.inputValue.isEmpty() && state.inputPlaceholder.isNotEmpty()) {
                                    Text(state.inputPlaceholder, style = type.small, color = colors.dimForeground)
                                }
                                BasicTextField(
                                    value = state.inputValue,
                                    onValueChange = DialogCenter::setInput,
                                    textStyle = type.small.copy(color = colors.foreground),
                                    cursorBrush = SolidColor(colors.foreground),
                                    singleLine = !state.inputMultiline,
                                    minLines = if (state.inputMultiline) 3 else 1,
                                    keyboardOptions = KeyboardOptions(imeAction = if (state.inputMultiline) ImeAction.Default else ImeAction.Done),
                                    keyboardActions = KeyboardActions(onDone = { DialogCenter.accept() }),
                                    interactionSource = interaction,
                                    modifier = Modifier.fillMaxWidth().focusRequester(inputFocus),
                                )
                            }
                        }
                    }
                }
                DfDivider()
                Row(
                    Modifier.fillMaxWidth().background(colors.surface).padding(horizontal = 24.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (state.hasCancel) {
                        DfButton(
                            state.cancelText,
                            onClick = DialogCenter::cancel,
                            variant = DfButtonVariant.SECONDARY,
                            modifier = Modifier
                                .weight(1f)
                                .onFocusChanged { cancelFocused = it.isFocused }
                                .focusRequester(cancelFocus),
                        )
                    }
                    DfButton(state.confirmText, onClick = DialogCenter::accept, variant = confirmVariant, modifier = Modifier.weight(1f))
                }
            }
        }
    }

    LaunchedEffect(state.title, state.type) {
        // Lo destructivo empieza en «Cancelar»; un prompt, en su campo.
        runCatching {
            when {
                state.type == DialogType.PROMPT -> inputFocus.requestFocus()
                danger && state.hasCancel -> cancelFocus.requestFocus()
            }
        }
    }
}

/** Los avisos apilados arriba (debajo de la barra de estado). Se van solos; los errores duran más. */
@Composable
fun BoxScope.ToastHost(modifier: Modifier = Modifier) {
    val toasts by ToastCenter.toasts.collectAsState()
    val colors = DevforgeTheme.colors
    Column(
        modifier
            .align(Alignment.TopCenter)
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(16.dp)
            .widthIn(max = 384.dp)
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        toasts.forEach { toast ->
            key(toast.id) {
                if (toast.durationMs > 0) {
                    LaunchedEffect(toast.id) {
                        delay(toast.durationMs)
                        ToastCenter.dismiss(toast.id)
                    }
                }
                val (icon, tint) = when (toast.type) {
                    ToastType.SUCCESS -> DfIconName.SUCCESS to colors.success
                    ToastType.ERROR -> DfIconName.ERROR to colors.danger
                    ToastType.WARNING -> DfIconName.WARNING to colors.warning
                    ToastType.INFO -> DfIconName.INFO to colors.mutedForeground
                }
                val shown = remember { MutableTransitionState(false).apply { targetState = true } }
                AnimatedVisibility(visibleState = shown, enter = fadeIn() + slideInVertically { -it / 3 }, exit = fadeOut()) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .heightIn(min = 48.dp)
                            .background(colors.surfaceRaised, DevforgeTheme.shapes.card)
                            .border(BorderStroke(1.dp, colors.border), DevforgeTheme.shapes.card)
                            .padding(start = 16.dp, end = 8.dp, top = 10.dp, bottom = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        DfIcon(icon, tint = tint)
                        Text(
                            toast.message,
                            style = DevforgeTheme.type.small.copy(fontWeight = FontWeight.Medium),
                            color = colors.foreground,
                            modifier = Modifier.weight(1f),
                        )
                        DfIconButton(DfIconName.CLOSE, label = "Cerrar aviso", onClick = { ToastCenter.dismiss(toast.id) }, size = 28.dp)
                    }
                }
            }
        }
    }
}
