import { SlotLocation } from '../react-providers';
import { ConstructorOf, Autowired, Injectable } from '@ali/common-di';
import { AppConfig } from '@ali/ide-core-browser';

export interface ComponentInfo {
  component: React.FunctionComponent | ConstructorOf<React.Component>;
  title?: string;
  iconClass?: string;
}

export const ComponentRegistry = Symbol('ComponentRegistry');

export interface ComponentRegistry {
  register(key: string, component: React.FunctionComponent | ConstructorOf<React.Component>, location?: SlotLocation): void;

  getComponentInfo(key: string): ComponentInfo | undefined;
}

@Injectable()
export class ComponentRegistryImpl implements ComponentRegistry {
  componentsMap: Map<string, ComponentInfo> = new Map();

  @Autowired(AppConfig)
  private config: AppConfig;

  register(key, component, location?: SlotLocation) {
    this.componentsMap.set(key, component);
    if (location) {
      let targetLocation = this.config.layoutConfig[location];
      if (!targetLocation) {
        targetLocation = {
          modules: [],
        };
        this.config.layoutConfig[location] = targetLocation;
      }
      if (targetLocation.modules.indexOf(key) > -1) {
        console.warn(`${location}位置已存在${key}模块`);
        return;
      }
      targetLocation.modules.push(key);
    }
  }

  getComponentInfo(key) {
    const componentInfo = this.componentsMap.get(key);
    return componentInfo;
  }
}

export interface LayoutContribution {
  // 将组件绑定到一个字符串
  registerComponent(registry: ComponentRegistry): void;
}

export const LayoutContribution = Symbol('LayoutContribution');
