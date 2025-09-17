import { _decorator, Component, Node, Sprite, SpriteFrame, input, Input, EventKeyboard, KeyCode } from 'cc';
import { HPBar } from "db://assets/Scripts/HPBar";
const { ccclass, property } = _decorator;

@ccclass('Fence')
export class Fence extends Component {
    @property(HPBar)
    hpBar: HPBar = null!;

    @property([Sprite])
    fenceSprites: Sprite[] = [];

    @property(SpriteFrame)
    normalSprite: SpriteFrame = null!;

    @property(SpriteFrame)
    whiteSprite: SpriteFrame = null!;

    @property
    maxHP: number = 200;

    private currentHP: number = 200;
    private isDestroyed: boolean = false;

    start() {
        this.currentHP = this.maxHP;

        if (this.hpBar) {
            this.hpBar.setMaxHP(this.maxHP);
            this.hpBar.node.active = false;
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.KEY_J) {
            this.takeDamage(20);
        }
    }

    public takeDamage(damage: number) {
        if (this.isDestroyed) return;

        this.currentHP -= damage;

        if (this.hpBar && this.currentHP < this.maxHP) {
            this.hpBar.node.active = true;
            this.hpBar.setHP(this.currentHP);
        }

        this.flashWhite();

        if (this.currentHP <= 0) {
            this.destroyFence();
        }
    }

    private flashWhite() {
        if (this.fenceSprites.length === 0 || !this.whiteSprite || !this.normalSprite) return;

        // đổi tất cả sprite sang trắng
        for (let sprite of this.fenceSprites) {
            sprite.spriteFrame = this.whiteSprite;
        }

        this.scheduleOnce(() => {
            // đổi lại sprite gốc
            for (let sprite of this.fenceSprites) {
                sprite.spriteFrame = this.normalSprite;
            }
        }, 0.1);
    }

    private destroyFence() {
        this.isDestroyed = true;
        this.node.destroy();
    }
}
