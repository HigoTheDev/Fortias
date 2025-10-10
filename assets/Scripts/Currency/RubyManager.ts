import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('RubyManager')
export class RubyManager extends Component {
    // Singleton
    public static instance: RubyManager = null;

    private activeRubies: Node[] = [];

    onLoad() {
        if (RubyManager.instance === null) {
            RubyManager.instance = this;
        } else {
            this.destroy();
        }
    }

    public getActiveRubies(): Node[] {
        return this.activeRubies;
    }

    public addRuby(rubyNode: Node) {
        this.activeRubies.push(rubyNode);
    }

    public removeRuby(rubyNode: Node) {
        const index = this.activeRubies.indexOf(rubyNode);
        if (index > -1) {
            this.activeRubies.splice(index, 1);
        }
    }
}