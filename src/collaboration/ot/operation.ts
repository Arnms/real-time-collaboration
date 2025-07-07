export enum OperationType {
  RETAIN = 'retain',
  INSERT = 'insert',
  DELETE = 'delete',
}

export interface OperationComponent {
  type: OperationType;
  length?: number; // retain, delete용
  text?: string; // insert용
  attributes?: Record<string, any>; // 포맷팅용
}

export class Operation {
  public components: OperationComponent[] = [];
  private _baseLength = 0;
  private _targetLength = 0;

  constructor(components?: OperationComponent[]) {
    if (components) {
      this.components = [...components];
      this.calculateLengths();
    }
  }

  // 기본 연산 메서드들
  retain(length: number, attributes?: Record<string, any>): Operation {
    if (length <= 0) return this;

    this.components.push({
      type: OperationType.RETAIN,
      length,
      attributes,
    });

    this._baseLength += length;
    this._targetLength += length;
    return this;
  }

  insert(text: string, attributes?: Record<string, any>): Operation {
    if (!text) return this;

    this.components.push({
      type: OperationType.INSERT,
      text,
      attributes,
    });

    this._targetLength += text.length;
    return this;
  }

  delete(length: number): Operation {
    if (length <= 0) return this;

    this.components.push({
      type: OperationType.DELETE,
      length,
    });

    this._baseLength += length;
    return this;
  }

  // Operation 적용
  apply(text: string): string {
    if (text.length !== this.baseLength) {
      throw new Error(
        `Base length mismatch: expected ${this.baseLength}, got ${text.length}`,
      );
    }

    let result = '';
    let index = 0;

    for (const component of this.components) {
      switch (component.type) {
        case OperationType.RETAIN:
          result += text.slice(index, index + component.length!);
          index += component.length!;
          break;

        case OperationType.INSERT:
          result += component.text!;
          break;

        case OperationType.DELETE:
          index += component.length!;
          break;
      }
    }

    return result;
  }

  // 두 Operation을 합성
  compose(other: Operation): Operation {
    if (this.targetLength !== other.baseLength) {
      throw new Error(
        `Cannot compose operations: target length ${this.targetLength} != base length ${other.baseLength}`,
      );
    }

    const result = new Operation();
    let i1 = 0,
      i2 = 0;
    let op1 = this.components[i1];
    let op2 = other.components[i2];

    while (op1 || op2) {
      if (op1?.type === OperationType.DELETE) {
        result.delete(op1.length!);
        op1 = this.components[++i1];
        continue;
      }

      if (op2?.type === OperationType.INSERT) {
        result.insert(op2.text!, op2.attributes);
        op2 = other.components[++i2];
        continue;
      }

      if (!op1 || !op2) {
        throw new Error("Cannot compose operations: operations don't align");
      }

      if (
        op1.type === OperationType.RETAIN &&
        op2.type === OperationType.RETAIN
      ) {
        const length1 = op1.length!;
        const length2 = op2.length!;

        if (length1 > length2) {
          result.retain(length2, op2.attributes);
          op1 = { ...op1, length: length1 - length2 };
          op2 = other.components[++i2];
        } else if (length1 === length2) {
          result.retain(length1, op2.attributes);
          op1 = this.components[++i1];
          op2 = other.components[++i2];
        } else {
          result.retain(length1, op2.attributes);
          op2 = { ...op2, length: length2 - length1 };
          op1 = this.components[++i1];
        }
      } else if (
        op1.type === OperationType.INSERT &&
        op2.type === OperationType.RETAIN
      ) {
        const length1 = op1.text!.length;
        const length2 = op2.length!;

        if (length1 > length2) {
          result.insert(op1.text!.slice(0, length2), op2.attributes);
          op1 = { ...op1, text: op1.text!.slice(length2) };
          op2 = other.components[++i2];
        } else if (length1 === length2) {
          result.insert(op1.text!, op2.attributes);
          op1 = this.components[++i1];
          op2 = other.components[++i2];
        } else {
          result.insert(op1.text!, op2.attributes);
          op2 = { ...op2, length: length2 - length1 };
          op1 = this.components[++i1];
        }
      } else if (
        op1.type === OperationType.INSERT &&
        op2.type === OperationType.DELETE
      ) {
        const length1 = op1.text!.length;
        const length2 = op2.length!;

        if (length1 > length2) {
          op1 = { ...op1, text: op1.text!.slice(length2) };
          op2 = other.components[++i2];
        } else if (length1 === length2) {
          op1 = this.components[++i1];
          op2 = other.components[++i2];
        } else {
          op2 = { ...op2, length: length2 - length1 };
          op1 = this.components[++i1];
        }
      } else if (
        op1.type === OperationType.RETAIN &&
        op2.type === OperationType.DELETE
      ) {
        const length1 = op1.length!;
        const length2 = op2.length!;

        if (length1 > length2) {
          result.delete(length2);
          op1 = { ...op1, length: length1 - length2 };
          op2 = other.components[++i2];
        } else if (length1 === length2) {
          result.delete(length1);
          op1 = this.components[++i1];
          op2 = other.components[++i2];
        } else {
          result.delete(length1);
          op2 = { ...op2, length: length2 - length1 };
          op1 = this.components[++i1];
        }
      }
    }

    return result;
  }

  // Operational Transformation 핵심: 두 Operation 변환
  static transform(
    op1: Operation,
    op2: Operation,
    priority: 'left' | 'right' = 'left',
  ): [Operation, Operation] {
    if (op1.baseLength !== op2.baseLength) {
      throw new Error(
        `Cannot transform operations: different base lengths ${op1.baseLength} vs ${op2.baseLength}`,
      );
    }

    const result1 = new Operation();
    const result2 = new Operation();

    let i1 = 0,
      i2 = 0;
    let comp1 = op1.components[i1];
    let comp2 = op2.components[i2];

    while (comp1 || comp2) {
      // Insert 우선 처리
      if (comp1?.type === OperationType.INSERT) {
        result1.insert(comp1.text!, comp1.attributes);
        result2.retain(comp1.text!.length);
        comp1 = op1.components[++i1];
        continue;
      }

      if (comp2?.type === OperationType.INSERT) {
        result1.retain(comp2.text!.length);
        result2.insert(comp2.text!, comp2.attributes);
        comp2 = op2.components[++i2];
        continue;
      }

      if (!comp1 || !comp2) {
        throw new Error("Cannot transform operations: operations don't align");
      }

      // Retain vs Retain
      if (
        comp1.type === OperationType.RETAIN &&
        comp2.type === OperationType.RETAIN
      ) {
        const length1 = comp1.length!;
        const length2 = comp2.length!;

        if (length1 > length2) {
          result1.retain(length2);
          result2.retain(length2);
          comp1 = { ...comp1, length: length1 - length2 };
          comp2 = op2.components[++i2];
        } else if (length1 === length2) {
          result1.retain(length1);
          result2.retain(length2);
          comp1 = op1.components[++i1];
          comp2 = op2.components[++i2];
        } else {
          result1.retain(length1);
          result2.retain(length1);
          comp2 = { ...comp2, length: length2 - length1 };
          comp1 = op1.components[++i1];
        }
      }
      // Delete vs Delete
      else if (
        comp1.type === OperationType.DELETE &&
        comp2.type === OperationType.DELETE
      ) {
        const length1 = comp1.length!;
        const length2 = comp2.length!;

        if (length1 > length2) {
          comp1 = { ...comp1, length: length1 - length2 };
          comp2 = op2.components[++i2];
        } else if (length1 === length2) {
          comp1 = op1.components[++i1];
          comp2 = op2.components[++i2];
        } else {
          comp2 = { ...comp2, length: length2 - length1 };
          comp1 = op1.components[++i1];
        }
      }
      // Retain vs Delete
      else if (
        comp1.type === OperationType.RETAIN &&
        comp2.type === OperationType.DELETE
      ) {
        const length1 = comp1.length!;
        const length2 = comp2.length!;

        if (length1 > length2) {
          result1.delete(length2);
          comp1 = { ...comp1, length: length1 - length2 };
          comp2 = op2.components[++i2];
        } else if (length1 === length2) {
          result1.delete(length1);
          comp1 = op1.components[++i1];
          comp2 = op2.components[++i2];
        } else {
          result1.delete(length1);
          comp2 = { ...comp2, length: length2 - length1 };
          comp1 = op1.components[++i1];
        }
      }
      // Delete vs Retain
      else if (
        comp1.type === OperationType.DELETE &&
        comp2.type === OperationType.RETAIN
      ) {
        const length1 = comp1.length!;
        const length2 = comp2.length!;

        if (length1 > length2) {
          result2.delete(length2);
          comp1 = { ...comp1, length: length1 - length2 };
          comp2 = op2.components[++i2];
        } else if (length1 === length2) {
          result2.delete(length1);
          comp1 = op1.components[++i1];
          comp2 = op2.components[++i2];
        } else {
          result2.delete(length1);
          comp2 = { ...comp2, length: length2 - length1 };
          comp1 = op1.components[++i1];
        }
      }
    }

    return [result1, result2];
  }

  // 역 연산 생성
  invert(text: string): Operation {
    const result = new Operation();
    let index = 0;

    for (const component of this.components) {
      switch (component.type) {
        case OperationType.RETAIN:
          result.retain(component.length!);
          index += component.length!;
          break;

        case OperationType.INSERT:
          result.delete(component.text!.length);
          break;

        case OperationType.DELETE:
          result.insert(text.slice(index, index + component.length!));
          index += component.length!;
          break;
      }
    }

    return result;
  }

  // 유틸리티 메서드들
  get baseLength(): number {
    return this._baseLength;
  }

  get targetLength(): number {
    return this._targetLength;
  }

  private calculateLengths(): void {
    this._baseLength = 0;
    this._targetLength = 0;

    for (const component of this.components) {
      switch (component.type) {
        case OperationType.RETAIN:
          this._baseLength += component.length!;
          this._targetLength += component.length!;
          break;

        case OperationType.INSERT:
          this._targetLength += component.text!.length;
          break;

        case OperationType.DELETE:
          this._baseLength += component.length!;
          break;
      }
    }
  }

  // 직렬화
  toJSON(): any {
    return {
      components: this.components,
      baseLength: this.baseLength,
      targetLength: this.targetLength,
    };
  }

  // 역직렬화
  static fromJSON(json: any): Operation {
    const op = new Operation(json.components);
    return op;
  }

  // 디버깅용
  toString(): string {
    return this.components
      .map((comp) => {
        switch (comp.type) {
          case OperationType.RETAIN:
            return `retain(${comp.length})`;
          case OperationType.INSERT:
            return `insert("${comp.text}")`;
          case OperationType.DELETE:
            return `delete(${comp.length})`;
        }
      })
      .join(' ');
  }

  // Operation 최적화 (연속된 같은 타입 컴포넌트 합치기)
  optimize(): Operation {
    const optimized = new Operation();
    let lastComponent: OperationComponent | null = null;

    for (const component of this.components) {
      if (lastComponent && lastComponent.type === component.type) {
        if (
          component.type === OperationType.RETAIN ||
          component.type === OperationType.DELETE
        ) {
          lastComponent.length =
            (lastComponent.length || 0) + (component.length || 0);
        } else if (component.type === OperationType.INSERT) {
          lastComponent.text =
            (lastComponent.text || '') + (component.text || '');
        }
      } else {
        if (lastComponent) {
          optimized.components.push(lastComponent);
        }
        lastComponent = { ...component };
      }
    }

    if (lastComponent) {
      optimized.components.push(lastComponent);
    }

    optimized.calculateLengths();
    return optimized;
  }

  // 유효성 검사
  isValid(): boolean {
    try {
      // 길이 검사
      let baseLength = 0;
      let targetLength = 0;

      for (const component of this.components) {
        switch (component.type) {
          case OperationType.RETAIN:
            if (!component.length || component.length <= 0) return false;
            baseLength += component.length;
            targetLength += component.length;
            break;

          case OperationType.INSERT:
            if (!component.text || component.text.length === 0) return false;
            targetLength += component.text.length;
            break;

          case OperationType.DELETE:
            if (!component.length || component.length <= 0) return false;
            baseLength += component.length;
            break;

          default:
            return false;
        }
      }

      return (
        baseLength === this.baseLength && targetLength === this.targetLength
      );
    } catch {
      return false;
    }
  }
}
