import { Provider, Injector } from '@ali/common-di';
import {
  IEventBus,
  EventBusImpl,
  CommandService,
  CommandRegistryImpl,
  CommandContribution,
  MenuContribution,
  createContributionProvider,
  CommandServiceImpl,
  CommandRegistry,
  IElectronMainMenuService,
  isElectronRenderer,
  ReporterMetadata,
  IReporter,
  IReporterService,
  DefaultReporter,
  ReporterService,
  REPORT_HOST,
  IProblemPatternRegistry,
  ProblemPatternRegistryImpl,
  IProblemMatcherRegistry,
  ProblemMatchersRegistryImpl,
  ITaskDefinitionRegistry,
  TaskDefinitionRegistryImpl,
  IApplicationService,
} from '@ali/ide-core-common';
import { ClientAppContribution } from '../common';
import { ClientAppStateService } from '../application/application-state-service';
import { ApplicationService } from '../application/application.service';
import { KeyboardNativeLayoutService, KeyboardLayoutChangeNotifierService } from '@ali/ide-core-common/lib/keyboard/keyboard-layout-provider';

import { KeybindingContribution, KeybindingService, KeybindingRegistryImpl, KeybindingRegistry } from '../keybinding';
import { BrowserKeyboardLayoutImpl } from '../keyboard';

import { Logger, ILogger } from '../logger';
import { ComponentRegistry, ComponentRegistryImpl, ComponentContribution, TabBarToolbarContribution } from '../layout';
import { useNativeContextMenu } from '../utils';
import { createElectronMainApi } from '../utils/electron';
import { IElectronMainUIService, IElectronMainLifeCycleService } from '@ali/ide-core-common/lib/electron';
import { PreferenceContribution } from '../preferences';
import { VariableRegistry, VariableRegistryImpl, VariableContribution} from '../variable';

import { AbstractMenuService, MenuServiceImpl, AbstractMenubarService, MenubarServiceImpl, IMenuRegistry, MenuRegistryImpl, NextMenuContribution, AbstractContextMenuService, ContextMenuServiceImpl } from '../menu/next';
import { ICtxMenuRenderer } from '../menu/next/renderer/ctxmenu/base';
import { ElectronCtxMenuRenderer, ElectronMenuBarService, IElectronMenuFactory, IElectronMenuBarService, ElectronMenuFactory } from '../menu/next/renderer/ctxmenu/electron';
import { BrowserCtxMenuRenderer } from '../menu/next/renderer/ctxmenu/browser';
import { SlotRendererContribution } from '../react-providers';
import { ToolbarActionService, IToolbarActionService } from '../menu/next/toolbar-action.service';
import { IProgressService } from '../progress';
import { ProgressService } from '../progress/progress.service';
import { NextToolbarRegistryImpl, ToolbarClientAppContribution } from '../toolbar/toolbar.registry';
import { IToolbarPopoverRegistry, IToolbarRegistry, ToolBarActionContribution } from '../toolbar';
import { FsProviderContribution } from '../fs';
import { IOpenerService } from '../opener';
import { OpenerService } from '../opener/opener.service';
import { IWindowService } from '../window';
import { WindowService } from '../window/window.service';
import { IClipboardService, BrowserClipboardService } from '../services/clipboard.service';
import { ToolbarPopoverRegistry } from '../toolbar/toolbar.popover.registry';

export function injectInnerProviders(injector: Injector) {
  // 生成 ContributionProvider
  createContributionProvider(injector, ClientAppContribution);
  createContributionProvider(injector, CommandContribution);
  createContributionProvider(injector, FsProviderContribution);
  createContributionProvider(injector, KeybindingContribution);
  createContributionProvider(injector, NextMenuContribution);
  createContributionProvider(injector, MenuContribution);
  createContributionProvider(injector, ComponentContribution);
  createContributionProvider(injector, SlotRendererContribution);
  createContributionProvider(injector, PreferenceContribution);
  createContributionProvider(injector, VariableContribution);
  createContributionProvider(injector, TabBarToolbarContribution);
  createContributionProvider(injector, ToolBarActionContribution);

  // 一些内置抽象实现
  const providers: Provider[] = [
    {
      token: IEventBus,
      useClass: EventBusImpl,
    },
    {
      token: CommandService,
      useClass: CommandServiceImpl,
    },
    {
      token: CommandRegistry,
      useClass: CommandRegistryImpl,
    },
    {
      token: KeybindingRegistry,
      useClass: KeybindingRegistryImpl,
    },
    {
      token: KeybindingService,
      useFactory: (inject: Injector) => {
        return inject.get(KeybindingRegistry);
      },
    },
    {
      token: KeyboardNativeLayoutService,
      useClass: BrowserKeyboardLayoutImpl,
    },
    {
      token: KeyboardLayoutChangeNotifierService,
      useClass: BrowserKeyboardLayoutImpl,
    },
    ClientAppStateService,
    {
      token: ILogger,
      useClass: Logger,
    },
    {
      token: ComponentRegistry,
      useClass: ComponentRegistryImpl,
    },
    {
      token: VariableRegistry,
      useClass: VariableRegistryImpl,
    },
    // next version menu
    {
      token: AbstractMenuService,
      useClass: MenuServiceImpl,
    },
    {
      token: AbstractContextMenuService,
      useClass: ContextMenuServiceImpl,
    },
    {
      token: IMenuRegistry,
      useClass: MenuRegistryImpl,
    },
    {
      token: IToolbarActionService,
      useClass: ToolbarActionService,
    },
    {
      token: ICtxMenuRenderer,
      useClass: useNativeContextMenu() ? ElectronCtxMenuRenderer : BrowserCtxMenuRenderer,
    },
    {
      token: AbstractMenubarService,
      useClass: MenubarServiceImpl,
    },
    {
      token: IReporter,
      useClass: DefaultReporter,
    },
    {
      token: IReporterService,
      useClass: ReporterService,
    },
    {
      token: ReporterMetadata,
      useValue: {
        host: REPORT_HOST.BROWSER,
      },
    },
    {
      token: IProgressService,
      useClass: ProgressService,
    },
    {
      token: IToolbarRegistry,
      useClass: NextToolbarRegistryImpl,
    },
    {
      token: IToolbarPopoverRegistry,
      useClass: ToolbarPopoverRegistry,
    },
    ToolbarClientAppContribution,
    {
      token: IProblemPatternRegistry,
      useClass: ProblemPatternRegistryImpl,
    },
    {
      token: IProblemMatcherRegistry,
      useClass: ProblemMatchersRegistryImpl,
    },
    {
      token: ITaskDefinitionRegistry,
      useClass: TaskDefinitionRegistryImpl,
    },
    {
      token: IOpenerService,
      useClass: OpenerService,
    },
    {
      token: IWindowService,
      useClass: WindowService,
    },
    {
      token: IApplicationService,
      useClass: ApplicationService,
    },
    {
      token: IClipboardService,
      useClass: BrowserClipboardService,
    },
  ];
  injector.addProviders(...providers);

  // 为electron添加独特的api服务，主要是向electron-main进行调用的服务
  if (isElectronRenderer()) {
    injector.addProviders({
      token: IElectronMainMenuService,
      useValue: createElectronMainApi('menu'),
    }, {
      token: IElectronMainUIService,
      useValue: createElectronMainApi('ui'),
    }, {
      token: IElectronMainLifeCycleService,
      useValue: createElectronMainApi('lifecycle'),
    },
    {
      token: IElectronMenuFactory,
      useClass: ElectronMenuFactory,
    },
    {
      token: IElectronMenuBarService,
      useClass: ElectronMenuBarService,
    },
    );
  }
}
