export default class ArchonControl extends FormApplication {

  static LOCAL_TEMPLATE = 'archon-control.hbs';
  static #MODULE = null

  /* Populated on `build` */
  static DEFAULT_TEMPLATE = '';
  
  static DEFAULT_KEEP = {
    'name': false,
    'img': false,
    'system': false,
    'flags': false,
  }

  static build(MODULE) {
    this.#MODULE = MODULE;
    this.DEFAULT_TEMPLATE = MODULE.paths.apps(this.LOCAL_TEMPLATE);
    loadTemplates([this.DEFAULT_TEMPLATE]);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(FormApplication.defaultOptions, {
      template: this.DEFAULT_TEMPLATE,
      id: 'archon-control',
      title: this.#MODULE.Core.translate('control.title'),
      popOut: true,
      resizable: true,
      closeOnSubmit: false,
      renderOnChange: true,
      submitOnChange: true,
      source: "",
      target: "",
      width:'auto',
      height:'auto',
      defaultName: 'Nothing Special',
      symbolic: true,
      icon: this.#MODULE.Lib.Archon.DEFAULT_ICON,
      keep: this.DEFAULT_KEEP,
      dragDrop: [{dropSelector: ".archon-body"}],
      classes: ['archon', 'archon-control'],
    }, {inplace:false})
  }

  #sourceItem = null
  #targetInfo = {img: null, name: null}

  #handleDrop(event, data) {
    if(data.type == 'Item' && 'uuid' in data) {
      
      const entry = event.currentTarget.getElementsByTagName('input')[0];
      entry.value = data.uuid;
      return {[entry.name]: data.uuid}
    }
    
    return {};
  }

  get MODULE() {
    return ArchonControl.#MODULE;
  }

  constructor(options = {}) {
    super(null, options);
  }

  activateListeners(html) {
    super.activateListeners(html);
    const archonArea = this.element[0].getElementsByClassName('scene-archons')?.['scene-archons'];
    if(!archonArea) return;
    archonArea.addEventListener('mouseup', this._handleArchonClick.bind(this));
  }

  _handleArchonClick(event) {
    const button = event.target.closest('button');
    
    if(!button) return;

    event.preventDefault();

    const divParent = event.target.closest('div')
    const uuid = divParent.dataset.uuid;
    const action = button.dataset.action;

    switch (action) {
      case 'view':
        const target = button.dataset.target;
        this.showItem(uuid, target);
        break;
      case 'unmask':
        this.reveal(uuid).then( result => {
          if (result === true) this.render(true);
        })
        break;
      case 'toggle':
        const id = button.name;
        const actions = this.element[0].getElementsByClassName('archon-actions')[id];
        actions.classList.toggle('collapsed');
        break;
    }


  }

  async getData(options={}) {
    const context = await super.getData(options);
    context.noCreate = !this.#sourceItem;
    context.sourceImage = this.#sourceItem?.img;
    context.sourceName = this.#sourceItem?.name;

    context.targetImage = (this.options.keep['img'] ? 
                            this.#sourceItem?.img :
                            this.#targetInfo.img) ?? this.options.icon;

    context.targetName = (this.options.keep['name'] ?
                            this.#sourceItem?.name :
                            this.#targetInfo.name) ?? this.options.defaultName;

    context.sceneArchons = this._getArchons(game.scenes.viewed);
    context.hasArchons = Reflect.ownKeys(context.sceneArchons).length > 0;
    return context;
  }

  _getArchons(scene = game.scenes.viewed) {
    const archonsByToken = scene.tokens.reduce( (acc, token) => {
      const archons = token.actor?.items
                        .filter( item => this.MODULE.Lib.Archon.isArchon(item) )
                        .map( item => {
                          const aData = this.MODULE.Lib.Archon.getData(item, false);
                          return {
                            uuid: item.uuid,
                            name: item.name,
                            img: item.img,
                            aName: aData.name,
                            aImg: aData.img,
                          }}) ?? [];

      if(archons.length > 0) acc[token.uuid] = {
                                archons,
                                tokenName: token.name,
                                tokenImg: token.texture.src,
      }

      return acc;
    },{});

    return archonsByToken
  }

  async _onSubmit(event, options = {}){

    options.updateData ??= {};

    if(event.submitter?.name == '_symbolic') {
      this.options.symbolic = !this.options.symbolic;
    } else if(event.submitter?.name in this.options.keep) {
      const path = event.submitter.name;
      this.options.keep[path] = !this.options.keep[path]
      if(path == 'name'){
        options.updateData[`archon-${path}`] = (this.options.keep[path] ?
                                                  this.#sourceItem?.[path] :
                                                  this.object?.[path]
                                                ) ?? this.#targetInfo.name ?? this.options.defaultName;
      }
    }

    options.updateData['archon-img'] = (this.options.keep['img'] ? this.#sourceItem?.img : this.object?.img) ?? this.options.icon;
    return super._onSubmit(event, options);
  }

  async _updateObject(event, data){
    if (this.options.source !== data['source'] ) {

      if (!!data.source) {
        this.#sourceItem = await fromUuid(data['source']);
        this.object = new (this.MODULE.Lib.Archon)({name: this.#targetInfo.name ?? this.options.defaultName, type: this.#sourceItem.type, img: this.options.icon});
        data['archon-name'] = this.object.name;
        data['archon-img'] = this.object.img;
      }
      else this.#sourceItem = null;

      this.options.source = !!data.source ? data['source'] : null;
    }

    if (this.options.target !== data['target']) {

      if (!!data.target) {
        const target = await fromUuid(data['target']);
        this.object = new (this.MODULE.Lib.Archon)(target.toObject());
        data['archon-name'] = this.object.name;
        data['archon-img']= this.object.img;
      } else this.object = null;

      this.options.target = !!data.target ? data['target'] : null;
    }

    this.#targetInfo.name = data['archon-name'];
    this.#targetInfo.img = data['archon-img'];

    if(event.submitter?.name == 'submit') {
      this.object.updateSource({...this.#targetInfo});
      return this._onCreate(event)
    }

    if(this.options.renderOnChange) return this.render(true);
    return;
  }

  _onDrop(event) {
    super._onDrop(event);
    const data = TextEditor.getDragEventData(event);
    const updateData = this.#handleDrop(event, data);

    if(this.options.submitOnChange) this._onSubmit(event, {updateData});
  }

  _onCreate(event) {
    return this.object.create(this.#sourceItem, this.options.symbolic, this.options.keep).then( item => {
      this.close();
      item.sheet.render(true);
      return item
    })
  }

  async showItem(uuid, target) {
    
    const item = await fromUuid(uuid);
    if (target == 'source') {
      const sheet = await this.MODULE.Lib.Archon.archonSheet(item);
      return sheet; 
    } else {
      return item.sheet.render(true, {editable: false});
    }


  }

  async reveal(uuid) {
    const item = await fromUuid(uuid);
    if (item) return this.MODULE.Lib.Archon.reveal(item);
  }
}

