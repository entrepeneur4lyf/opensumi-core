import * as vscode from 'vscode';
import URI from 'vscode-uri';
import { illegalArgument } from './utils';
import { FileStat } from '@ali/ide-file-service/lib/common';

export enum Schemas {
  untitled = 'untitled',
}

export class Position {

  static Min(...positions: Position[]): Position {
    if (positions.length === 0) {
      throw new TypeError();
    }
    let result = positions[0];
    for (let i = 1; i < positions.length; i++) {
      const p = positions[i];
      if (p.isBefore(result!)) {
        result = p;
      }
    }
    return result;
  }

  static Max(...positions: Position[]): Position {
    if (positions.length === 0) {
      throw new TypeError();
    }
    let result = positions[0];
    for (let i = 1; i < positions.length; i++) {
      const p = positions[i];
      if (p.isAfter(result!)) {
        result = p;
      }
    }
    return result;
  }

  static isPosition(other: any): other is Position {
    if (!other) {
      return false;
    }
    if (other instanceof Position) {
      return true;
    }
    const { line, character } = other as Position;
    if (typeof line === 'number' && typeof character === 'number') {
      return true;
    }
    return false;
  }

  private _line: number;
  private _character: number;

  get line(): number {
    return this._line;
  }

  get character(): number {
    return this._character;
  }

  constructor(line: number, character: number) {
    if (line < 0) {
      throw new Error('illegal argument: line must be non-negative');
    }
    if (character < 0) {
      throw new Error('illegal argument: character must be non-negative');
    }
    this._line = line;
    this._character = character;
  }

  isBefore(other: Position): boolean {
    if (this._line < other._line) {
      return true;
    }
    if (other._line < this._line) {
      return false;
    }
    return this._character < other._character;
  }

  isBeforeOrEqual(other: Position): boolean {
    if (this._line < other._line) {
      return true;
    }
    if (other._line < this._line) {
      return false;
    }
    return this._character <= other._character;
  }

  isAfter(other: Position): boolean {
    return !this.isBeforeOrEqual(other);
  }

  isAfterOrEqual(other: Position): boolean {
    return !this.isBefore(other);
  }

  isEqual(other: Position): boolean {
    return this._line === other._line && this._character === other._character;
  }

  compareTo(other: Position): number {
    if (this._line < other._line) {
      return -1;
    } else if (this._line > other.line) {
      return 1;
    } else {
      // equal line
      if (this._character < other._character) {
        return -1;
      } else if (this._character > other._character) {
        return 1;
      } else {
        // equal line and character
        return 0;
      }
    }
  }

  translate(change: { lineDelta?: number; characterDelta?: number; }): Position;
  translate(lineDelta?: number, characterDelta?: number): Position;
  translate(lineDeltaOrChange: number | undefined | { lineDelta?: number; characterDelta?: number; }, characterDelta: number = 0): Position {

    if (lineDeltaOrChange === null || characterDelta === null) {
      throw new Error('illegal argument');
    }

    let lineDelta: number;
    if (typeof lineDeltaOrChange === 'undefined') {
      lineDelta = 0;
    } else if (typeof lineDeltaOrChange === 'number') {
      lineDelta = lineDeltaOrChange;
    } else {
      lineDelta = typeof lineDeltaOrChange.lineDelta === 'number' ? lineDeltaOrChange.lineDelta : 0;
      characterDelta = typeof lineDeltaOrChange.characterDelta === 'number' ? lineDeltaOrChange.characterDelta : 0;
    }

    if (lineDelta === 0 && characterDelta === 0) {
      return this;
    }
    return new Position(this.line + lineDelta, this.character + characterDelta);
  }

  with(change: { line?: number; character?: number; }): Position;
  with(line?: number, character?: number): Position;
  with(lineOrChange: number | undefined | { line?: number; character?: number; }, character: number = this.character): Position {

    if (lineOrChange === null || character === null) {
      throw new Error('illegal argument');
    }

    let line: number;
    if (typeof lineOrChange === 'undefined') {
      line = this.line;

    } else if (typeof lineOrChange === 'number') {
      line = lineOrChange;

    } else {
      line = typeof lineOrChange.line === 'number' ? lineOrChange.line : this.line;
      character = typeof lineOrChange.character === 'number' ? lineOrChange.character : this.character;
    }

    if (line === this.line && character === this.character) {
      return this;
    }
    return new Position(line, character);
  }

  toJSON(): any {
    return { line: this.line, character: this.character };
  }
}

export class Range {

  static isRange(thing: any): thing is vscode.Range {
    if (thing instanceof Range) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return Position.isPosition((thing as Range).start)
      && Position.isPosition((thing as Range).end);
  }

  protected _start: Position;
  protected _end: Position;

  get start(): Position {
    return this._start;
  }

  get end(): Position {
    return this._end;
  }

  constructor(start: Position, end: Position);
  constructor(startLine: number, startColumn: number, endLine: number, endColumn: number);
  constructor(startLineOrStart: number | Position, startColumnOrEnd: number | Position, endLine?: number, endColumn?: number) {
    let start: Position | undefined;
    let end: Position | undefined;

    if (typeof startLineOrStart === 'number' && typeof startColumnOrEnd === 'number' && typeof endLine === 'number' && typeof endColumn === 'number') {
      start = new Position(startLineOrStart, startColumnOrEnd);
      end = new Position(endLine, endColumn);
    } else if (startLineOrStart instanceof Position && startColumnOrEnd instanceof Position) {
      start = startLineOrStart;
      end = startColumnOrEnd;
    }

    if (!start || !end) {
      throw new Error('Invalid arguments');
    }

    if (start.isBefore(end)) {
      this._start = start;
      this._end = end;
    } else {
      this._start = end;
      this._end = start;
    }
  }

  contains(positionOrRange: Position | Range): boolean {
    if (positionOrRange instanceof Range) {
      return this.contains(positionOrRange._start)
        && this.contains(positionOrRange._end);

    } else if (positionOrRange instanceof Position) {
      if (positionOrRange.isBefore(this._start)) {
        return false;
      }
      if (this._end.isBefore(positionOrRange)) {
        return false;
      }
      return true;
    }
    return false;
  }

  isEqual(other: Range): boolean {
    return this._start.isEqual(other._start) && this._end.isEqual(other._end);
  }

  intersection(other: Range): Range | undefined {
    const start = Position.Max(other.start, this._start);
    const end = Position.Min(other.end, this._end);
    if (start.isAfter(end)) {
      // this happens when there is no overlap:
      // |-----|
      //          |----|
      return undefined;
    }
    return new Range(start, end);
  }

  union(other: Range): Range {
    if (this.contains(other)) {
      return this;
    } else if (other.contains(this)) {
      return other;
    }
    const start = Position.Min(other.start, this._start);
    const end = Position.Max(other.end, this.end);
    return new Range(start, end);
  }

  get isEmpty(): boolean {
    return this._start.isEqual(this._end);
  }

  get isSingleLine(): boolean {
    return this._start.line === this._end.line;
  }

  with(change: { start?: Position, end?: Position }): Range;
  with(start?: Position, end?: Position): Range;
  with(startOrChange: Position | undefined | { start?: Position, end?: Position }, end: Position = this.end): Range {

    if (startOrChange === null || end === null) {
      throw new Error('illegal argument');
    }

    let start: Position;
    if (!startOrChange) {
      start = this.start;

    } else if (Position.isPosition(startOrChange)) {
      start = startOrChange;

    } else {
      start = startOrChange.start || this.start;
      end = startOrChange.end || this.end;
    }

    if (start.isEqual(this._start) && end.isEqual(this.end)) {
      return this;
    }
    return new Range(start, end);
  }

  toJSON(): any {
    return [this.start, this.end];
  }
}

export enum EndOfLine {
  LF = 1,
  CRLF = 2,
}

export class RelativePattern {

  base: string;

  constructor(base: vscode.WorkspaceFolder | string, public pattern: string) {
    if (typeof base !== 'string') {
      if (!base || !URI.isUri(base.uri)) {
        throw new Error('illegalArgument: base');
      }
    }

    if (typeof pattern !== 'string') {
      throw new Error('illegalArgument: pattern');
    }

    this.base = typeof base === 'string' ? base : base.uri.fsPath;
  }

  pathToRelative(from: string, to: string): string {
    // return relative(from, to);
    return 'not implement!';
  }
}
export class Location {
  static isLocation(thing: any): thing is Location {
    if (thing instanceof Location) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return Range.isRange((thing as Location).range)
      && URI.isUri((thing as Location).uri);
  }

  uri: URI;
  range: Range;

  constructor(uri: URI, rangeOrPosition: Range | Position) {
    this.uri = uri;

    if (!rangeOrPosition) {
      // that's OK
    } else if (rangeOrPosition instanceof Range) {
      this.range = rangeOrPosition;
    } else if (rangeOrPosition instanceof Position) {
      this.range = new Range(rangeOrPosition, rangeOrPosition);
    } else {
      throw new Error('Illegal argument');
    }
  }

  toJSON(): any {
    return {
      uri: this.uri,
      range: this.range,
    };
  }
}

export class Disposable {
  private disposable: undefined | (() => void);

  // tslint:disable-next-line:no-any
  static from(...disposables: { dispose(): any }[]): Disposable {
    return new Disposable(() => {
      if (disposables) {
        for (const disposable of disposables) {
          if (disposable && typeof disposable.dispose === 'function') {
            disposable.dispose();
          }
        }
      }
    });
  }

  constructor(func: () => void) {
    this.disposable = func;
  }
  /**
   * Dispose this object.
   */
  dispose(): void {
    if (this.disposable) {
      this.disposable();
      this.disposable = undefined;
    }
  }

  static create(func: () => void): Disposable {
    return new Disposable(func);
  }
}

export class Hover {

  public contents: MarkdownString[] | vscode.MarkedString[];
  public range?: Range;

  constructor(
    contents: MarkdownString | vscode.MarkedString | MarkdownString[] | vscode.MarkedString[],
    range?: Range,
  ) {
    if (!contents) {
      throw new Error('illegalArgument：contents must be defined');
    }
    if (Array.isArray(contents)) {
      this.contents = contents as MarkdownString[] | vscode.MarkedString[];
    } else if (isMarkdownString(contents)) {
      this.contents = [contents];
    } else {
      this.contents = [contents];
    }
    this.range = range;
  }
}

export class MarkdownString {

  value: string;
  isTrusted?: boolean;

  constructor(value?: string) {
    this.value = value || '';
  }

  appendText(value: string): MarkdownString {
    // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
    this.value += value.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
    return this;
  }

  appendMarkdown(value: string): MarkdownString {
    this.value += value;
    return this;
  }

  appendCodeblock(code: string, language: string = ''): MarkdownString {
    this.value += '\n```';
    this.value += language;
    this.value += '\n';
    this.value += code;
    this.value += '\n```\n';
    return this;
  }
}

// tslint:disable-next-line:no-any
export function isMarkdownString(thing: any): thing is MarkdownString {
  if (thing instanceof MarkdownString) {
    return true;
  } else if (thing && typeof thing === 'object') {
    return typeof (thing as MarkdownString).value === 'string'
      && (typeof (thing as MarkdownString).isTrusted === 'boolean' || (thing as MarkdownString).isTrusted === void 0);
  }
  return false;
}

export class SnippetString {

  static isSnippetString(thing: {}): thing is SnippetString {
    if (thing instanceof SnippetString) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return typeof (thing as SnippetString).value === 'string';
  }

  private static _escape(value: string): string {
    return value.replace(/\$|}|\\/g, '\\$&');
  }

  private _tabstop: number = 1;

  value: string;

  constructor(value?: string) {
    this.value = value || '';
  }

  appendText(str: string): SnippetString {
    this.value += SnippetString._escape(str);
    return this;
  }

  appendTabstop(num: number = this._tabstop++): SnippetString {
    this.value += '$';
    this.value += num;
    return this;
  }

  appendPlaceholder(value: string | ((snippet: SnippetString) => void), num: number = this._tabstop++): SnippetString {

    if (typeof value === 'function') {
      const nested = new SnippetString();
      nested._tabstop = this._tabstop;
      value(nested);
      this._tabstop = nested._tabstop;
      value = nested.value;
    } else {
      value = SnippetString._escape(value);
    }

    this.value += '${';
    this.value += num;
    this.value += ':';
    this.value += value;
    this.value += '}';

    return this;
  }

  appendVariable(name: string, defaultValue?: string | ((snippet: SnippetString) => void)): SnippetString {

    if (typeof defaultValue === 'function') {
      const nested = new SnippetString();
      nested._tabstop = this._tabstop;
      defaultValue(nested);
      this._tabstop = nested._tabstop;
      defaultValue = nested.value;

    } else if (typeof defaultValue === 'string') {
      defaultValue = defaultValue.replace(/\$|}/g, '\\$&');
    }

    this.value += '${';
    this.value += name;
    if (defaultValue) {
      this.value += ':';
      this.value += defaultValue;
    }
    this.value += '}';

    return this;
  }
}

export class TextEdit {

  protected _range: Range;
  protected _newText: string;
  protected _newEol: EndOfLine;

  get range(): Range {
    return this._range;
  }

  set range(value: Range) {
    if (value && !Range.isRange(value)) {
      throw illegalArgument('range');
    }
    this._range = value;
  }

  get newText(): string {
    return this._newText || '';
  }

  set newText(value: string) {
    if (value && typeof value !== 'string') {
      throw illegalArgument('newText');
    }
    this._newText = value;
  }

  get newEol(): EndOfLine {
    return this._newEol;
  }

  set newEol(value: EndOfLine) {
    if (value && typeof value !== 'number') {
      throw illegalArgument('newEol');
    }
    this._newEol = value;
  }

  constructor(range: Range | undefined, newText: string | undefined) {
    this.range = range!;
    this.newText = newText!;
  }

  static isTextEdit(thing: {}): thing is TextEdit {
    if (thing instanceof TextEdit) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return Range.isRange((thing as TextEdit).range)
      && typeof (thing as TextEdit).newText === 'string';
  }

  static replace(range: Range, newText: string): TextEdit {
    return new TextEdit(range, newText);
  }

  static insert(position: Position, newText: string): TextEdit {
    return TextEdit.replace(new Range(position, position), newText);
  }

  static delete(range: Range): TextEdit {
    return TextEdit.replace(range, '');
  }

  static setEndOfLine(eol: EndOfLine): TextEdit {
    const ret = new TextEdit(undefined, undefined);
    ret.newEol = eol;
    return ret;
  }
}

export enum CompletionTriggerKind {
  Invoke = 0,
  TriggerCharacter = 1,
  TriggerForIncompleteCompletions = 2,
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  File = 16,
  Reference = 17,
  Folder = 18,
  EnumMember = 19,
  Constant = 20,
  Struct = 21,
  Event = 22,
  Operator = 23,
  TypeParameter = 24,
}
export class CompletionItem implements vscode.CompletionItem {

  label: string;
  kind: CompletionItemKind | undefined;
  detail?: string;
  documentation?: string | MarkdownString;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  insertText: string | SnippetString;
  keepWhitespace?: boolean;
  range: Range;
  commitCharacters?: string[];
  textEdit: TextEdit;
  additionalTextEdits: TextEdit[];
  command: vscode.Command;

  constructor(label: string, kind?: CompletionItemKind) {
    this.label = label;
    this.kind = kind;
  }

  toJSON(): any {
    return {
      label: this.label,
      kind: this.kind && CompletionItemKind[this.kind],
      detail: this.detail,
      documentation: this.documentation,
      sortText: this.sortText,
      filterText: this.filterText,
      preselect: this.preselect,
      insertText: this.insertText,
      textEdit: this.textEdit,
    };
  }
}

export class CompletionList {

  isIncomplete?: boolean;

  items: vscode.CompletionItem[];

  constructor(items: vscode.CompletionItem[] = [], isIncomplete: boolean = false) {
    this.items = items;
    this.isIncomplete = isIncomplete;
  }
}
export class Uri extends URI {

}

export enum ConfigurationTarget {
  /**
   * Global configuration
  */
  Global = 1,

  /**
   * Workspace configuration
   */
  Workspace = 2,

  /**
   * Workspace folder configuration
   */
  WorkspaceFolder = 3,
}
