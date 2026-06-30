/**
 * Função para tocar som de sucesso ao concluir tarefas
 */
export function playSuccessSound() {
  try {
    // Tentar carregar o arquivo de som
    const audio = new Audio('/sounds/success.mp3')
    audio.volume = 0.5
    audio.play().catch((e) => {
      // Silenciar erro se o arquivo não existir ou falhar ao tocar
      console.log('Audio play failed (arquivo pode não existir):', e)
    })
  } catch (error) {
    // Silenciar erro se Audio não estiver disponível (SSR)
    console.log('Audio não disponível:', error)
  }
}
