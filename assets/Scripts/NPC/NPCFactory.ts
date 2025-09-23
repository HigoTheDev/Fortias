import { _decorator, Component, SpriteAtlas, Sprite, Node } from "cc";
const { ccclass, property } = _decorator;

@ccclass("NPCFactory")
export class NPCFactory extends Component {
    @property(SpriteAtlas)
    atlas: SpriteAtlas = null!;

    @property([Node])
    npcNodes: Node[] = [];

    private spriteNames: string[] = [];

    start() {
        // Lấy toàn bộ spriteFrame trong atlas
        this.spriteNames = this.atlas.getSpriteFrames().map(sf => sf.name);

        // Gán ngẫu nhiên cho NPC
        this.npcNodes.forEach(npc => {
            const sprite = npc.getComponent(Sprite);
            const randomName = this.spriteNames[Math.floor(Math.random() * this.spriteNames.length)];
            const frame = this.atlas.getSpriteFrame(randomName);
            sprite.spriteFrame = frame!;
        });
    }
}
