import offensiveWordsData from './offensiveWords.json';
export class MessageFilter {
  // Lista de palavras e variações para bloquear
  private offensiveWords: string[] = offensiveWordsData.words;

  // Função para normalizar uma mensagem, removendo acentos, duplicações e substituições comuns
  private normalizeMessage(message: string): string {
    return message
      .normalize("NFD") // Remove acentos
      .replace(/[\u0300-\u036f]/g, "") // Remove marcas de diacríticos
      .replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, "") // Remove caracteres especiais
      .replace(/(.)\1{2,}/g, "$1") // Remove letras repetidas 3 ou mais vezes
      .toLowerCase();
  }

  // Função para detectar se a mensagem contém palavras ofensivas
  public containsOffensiveLanguage(message: string): boolean {
    // Normaliza a mensagem
    const normalizedMessage = this.normalizeMessage(message);
    // Verifica se algum termo ofensivo está presente na mensagem normalizada
    return this.offensiveWords.some(offensiveWord => {
      const current = offensiveWord.toLowerCase();
      const isOffensive = (normalizedMessage.includes(current) && (normalizedMessage.includes(` ${current}`) || normalizedMessage.includes(`${current} `))) || normalizedMessage === current
      if (isOffensive) {
        console.log(`Offensive word found: ${current}`);
        console.log(`Normalized message: ${normalizedMessage}`);
      }
      return isOffensive
    });
  }
}
