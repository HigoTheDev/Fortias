import { _decorator, Component, sp, input, Input, EventKeyboard, KeyCode, Vec2, RigidBody2D, Node, Vec3, tween } from 'cc';
import { VirtualJoystick } from "db://assets/Scripts/Player/VirtualJoystick";
import { HPBar } from "db://assets/Scripts/Player/HPBar";
import { Currency, CurrencyType } from "db://assets/Scripts/Currency/Currency";
import { CurrencyManager } from "db://assets/Scripts/Currency/CurrencyManager";

const { ccclass, property } = _decorator;

enum PlayerState {
    Idle,
    Run,
    Attack,
    Die
}

@ccclass('PlayerSpine')
export class PlayerSpine extends Component {
    @property(sp.Skeleton)
    spine: sp.Skeleton = null!;

    @property(RigidBody2D)
    body: RigidBody2D = null!;

    @property
    speed: number = 200;

    @property(VirtualJoystick)
    joystick: VirtualJoystick | null = null;

    @property(Node)
    hpBarNode: Node = null!;

    @property({ min: 1, max: 1000 })
    maxHP: number = 100;

    @property(CurrencyManager)
    currencyManager: CurrencyManager = null!;

    @property(Node)
    stackGold: Node = null!;

    @property(Node)
    stackDiamond: Node = null!;

    private moveDirKeyboard: Vec2 = new Vec2(0, 0);
    private moveDir: Vec2 = new Vec2(0, 0);
    private tempVec2: Vec2 = new Vec2();
    private originalScaleX: number = 1;
    private hpBar: HPBar;
    public hp: number = 100;
    private state: PlayerState = PlayerState.Idle;

    private goldOffset: number = 0;
    private diamondOffset: number = 0;

    start() {
        this.hpBar = this.hpBarNode.getComponent(HPBar)!;
        this.hp = this.maxHP;
        this.hpBar.setMaxHP(this.hp);

        this.originalScaleX = this.node.getScale().x;
        this.spine.setAnimation(0, "idle", true);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        if (this.body) {
            this.body.fixedRotation = true;
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        if (this.spine) this.spine.setCompleteListener(null);
    }

    update() {
        if (this.state == PlayerState.Die || this.state == PlayerState.Attack) {
            if (this.body) this.body.linearVelocity = this.tempVec2.set(0, 0);
            return;
        }

        let dir = new Vec2(0, 0);
        if (this.joystick && this.joystick.isUsingJoystic) {
            dir = this.joystick.getAxis();
        } else {
            dir = this.moveDirKeyboard.clone();
        }
        if (dir.length() > 1) dir = dir.normalize();

        this.moveDir = dir;

        if (this.body) {
            this.tempVec2.set(this.moveDir.x * this.speed, this.moveDir.y * this.speed);
            this.body.linearVelocity = this.tempVec2;
        }

        if (this.moveDir.x !== 0 || this.moveDir.y !== 0) {
            if (this.state !== PlayerState.Run) {
                this.state = PlayerState.Run;
                this.spine.setAnimation(0, "run", true);
            }
            this.node.setScale(this.moveDir.x > 0 ? this.originalScaleX : -this.originalScaleX, this.node.getScale().y, 1);
        } else {
            if (this.state !== PlayerState.Idle) {
                this.state = PlayerState.Idle;
                this.spine.setAnimation(0, "idle", true);
            }
        }

        this.checkCurrencyDistance();
    }

    private checkCurrencyDistance() {
        const currencies = this.node.scene.getComponentsInChildren(Currency);
        for (const currency of currencies) {
            const coinNode = currency.node;
            if (!coinNode.active) continue;

            const distance = Vec3.distance(this.node.worldPosition, coinNode.worldPosition);
            if (distance < 50) {
                this.collectCurrency(currency);
            }
        }
    }

    private collectCurrency(currency: Currency) {
        const coinNode = currency.node;
        if (!coinNode.active) return;

        coinNode.active = false;

        let targetPos: Vec3;
        if (currency.type === CurrencyType.Gold) {
            this.goldOffset += 30;
            targetPos = new Vec3(0, this.goldOffset, 0);
            coinNode.setParent(this.stackGold);
        } else {
            this.diamondOffset += 30;
            targetPos = new Vec3(0, this.diamondOffset, 0);
            coinNode.setParent(this.stackDiamond);
        }

        coinNode.setWorldPosition(this.node.worldPosition);

        tween(coinNode)
            .to(0.3, { position: targetPos }, { easing: "quadOut" })
            .call(() => {
                coinNode.active = true;
            })
            .start();

        if (this.currencyManager) {
            this.currencyManager.addCurrency(currency.type, 1); // mỗi coin chỉ +1
        }
    }

    // ========== Combat ==========
    public attack() {
        if (this.state === PlayerState.Die) return;
        this.state = PlayerState.Attack;
        this.spine.setAnimation(0, "attack_melee_1", false);

        this.spine.setCompleteListener(null);
        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "attack_melee_1") {
                if (this.state === PlayerState.Attack) {
                    this.state = PlayerState.Idle;
                    this.spine.setAnimation(0, "idle", true);
                }
            }
        });
    }

    public die() {
        if (this.state === PlayerState.Die) return;
        this.state = PlayerState.Die;
        this.hp = 0;

        if (this.body) this.body.linearVelocity = this.tempVec2.set(0, 0);

        this.spine.setAnimation(0, "die", false);
        this.spine.setCompleteListener(null);
        this.spine.setCompleteListener((trackEntry) => {
            if (trackEntry.animation.name === "die") this.node.destroy();
        });
    }

    public takeDamage(dmg: number) {
        if (this.state === PlayerState.Die) return;
        this.hp = Math.max(0, this.hp - dmg);
        this.hpBar.setHP(this.hp);
        if (this.hp <= 0) this.die();
    }

    // ========== Keyboard ==========
    private onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W: this.moveDirKeyboard.y = 1; break;
            case KeyCode.KEY_S: this.moveDirKeyboard.y = -1; break;
            case KeyCode.KEY_A: this.moveDirKeyboard.x = -1; break;
            case KeyCode.KEY_D: this.moveDirKeyboard.x = 1; break;
            case KeyCode.SPACE: this.attack(); break;
            case KeyCode.KEY_P: this.die(); break;
            case KeyCode.KEY_L: this.takeDamage(50); break;
        }
    }
    private onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W: if (this.moveDirKeyboard.y > 0) this.moveDirKeyboard.y = 0; break;
            case KeyCode.KEY_S: if (this.moveDirKeyboard.y < 0) this.moveDirKeyboard.y = 0; break;
            case KeyCode.KEY_A: if (this.moveDirKeyboard.x < 0) this.moveDirKeyboard.x = 0; break;
            case KeyCode.KEY_D: if (this.moveDirKeyboard.x > 0) this.moveDirKeyboard.x = 0; break;
        }
    }
}
