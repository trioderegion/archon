export class Core {

  static #MODULE = null;
  
  static build(MODULE) {
    Core.#hooks();
    this.#MODULE = MODULE;
  }

  static translate(moduleKey, data = {}) {
    return game.i18n.format(`${Core.#MODULE.meta.id}.${moduleKey}`, data);
  }

  static #hooks() {
    Hooks.on('renderItemDirectory', Core._onRender.bind(this));
  }

  static _onRender(_, elements) {
    if(!game.user.isGM) return;
    const html = elements[0];

    const [existing = null] = html.getElementsByClassName('archon');
    if (existing) return;

    const [searchRow = null] = html.getElementsByClassName('header-search')
    if (!searchRow) return;

    const buttonHTML = `
      <a class="archon" name="create-archon" data-tooltip="${this.translate('show')}"><i class="fas fa-eye-low-vision"></i></a>
      `

    searchRow.insertAdjacentHTML('beforeend', buttonHTML);

    const button = searchRow.getElementsByClassName('archon')['create-archon'];
    if (!button) throw new Error('Uh oh');

    button.addEventListener('mouseup', Core._onCreate.bind(this));
  }

  static _onCreate(event) {
    event.preventDefault;
    new (this.#MODULE.Apps.ArchonControl)().render(true); 
  }
  
}
