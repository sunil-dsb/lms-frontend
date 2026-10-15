'use client';

import * as React from 'react';
import { useProcedureEditorModel, type ProcedureEditorProps } from './procedure-editor-model';
import { ProcedureEditorView } from './procedure-editor-view';

export function ProcedureEditor(props: ProcedureEditorProps): React.ReactElement {
  const model = useProcedureEditorModel(props);
  return <ProcedureEditorView model={model} />;
}
  