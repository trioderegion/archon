export default class Core {
  
  static build() {
    Core.#hooks();
  }

  static #hooks() {
    Hooks.on('renderItemDirectory', Core._onRender);
  }

  static _onRender(_, elements) {
    if(!game.user.isGM) return;
    const html = elements[0];

    const [existing = null] = html.getElementsByClassName('archon');
    if (existing) return;

    const [searchRow = null] = html.getElementsByClassName('header-search')
    if (!searchRow) return;

    const buttonHTML = `
      <a class="archon" name="create-archon"><i class="fas fa-eye-low-vision"></i></a>
      `

    searchRow.insertAdjacentHTML('beforeend', buttonHTML);

    const button = searchRow.getElementsByClassName('archon')['create-archon'];
    if (!button) throw new Error('Uh oh');

    button.addEventListener('mouseup', Core._onCreate);
  }

  static _onCreate(event) {
    event.preventDefault;

    return Core._handleCreate();
  }

  static async _handleCreate() {

    const result = await warpgate.menu({
      inputs: [{type:'text', label: 'Item UUID: ', options: ''}],
      buttons: [{label: 'Unmask Selected Token', value: 'unmask'},
        {label: 'Create Mask from UUID', value: 'mask'}]
    }, {title: 'Archon'})

    if(result.buttons === false) return;

    switch (result.buttons) {
      case 'mask': return Core.create(result.inputs[0]);
      case 'unmask': return Core.unmask(canvas.tokens.controlled[0]?.document);
    }
  }

  static async unmask(token) {
    const archons = token?.actor?.items.filter( item => !!item.getFlag('warpgate','archon')) ?? [];

    const choice = await warpgate.buttonDialog({
      buttons: archons.length > 0 ? archons.map( item => {
        const archon = item.getFlag('warpgate','archon');
        mergeObject(archon.flags, {warpgate: {archon: false}});
        return {
          value: {id: item.id, name: item.name, archon},
          label: `[${item.name}] to [${archon.name}]`
        }
      }) : [{value: false, label: 'Close'}],
      title: `Unmasking Item from ${token.name}`,
    }, 'column');

    if(!choice) return;

    const updates = {
      embedded: {
        Item: {
          [choice.id]: choice.archon
        }
      }
    }

    const options = {
      permanent: true,
      description: `Unmasking ${choice.name}`,
      comparisonKeys: {Item: 'id'}
    }

    await warpgate.mutate(token, updates, {}, options)
  }

  static async create(uuid) {

    const sourceItem = await fromUuid(uuid);
    const sourceData = sourceItem.toObject();

    const maskedData = {
      name: 'Nothing Special',
      type: sourceData.type,
      flags: {
        warpgate: {
          archon: sourceData
        }
      }
    }

    const maskedItem = await Item.implementation.create(maskedData);
    maskedItem.sheet.render(true);
  }
}
