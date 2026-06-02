import { Injectable, ApplicationRef, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { DialogComponent } from '../components/dialog/dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialogRefs: ComponentRef<DialogComponent>[] = [];

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  public async confirm(message: string, title = ''): Promise<boolean> {
    return new Promise((resolve) => {
      this.openDialog(message, title, true, (result) => resolve(result));
    });
  }

  public async alert(message: string, title = ''): Promise<void> {
    return new Promise((resolve) => {
      this.openDialog(message, title, false, () => resolve());
    });
  }

  private openDialog(message: string, title: string, isConfirm: boolean, onClose: (result: boolean) => void) {
    const dialogRef = createComponent(DialogComponent, {
      environmentInjector: this.injector
    });

    dialogRef.setInput('message', message);
    dialogRef.setInput('title', title);
    dialogRef.setInput('isConfirm', isConfirm);
    dialogRef.changeDetectorRef.detectChanges();

    dialogRef.instance.closeEvent.subscribe((result: boolean) => {
      onClose(result);
      this.removeDialog(dialogRef);
    });

    this.appRef.attachView(dialogRef.hostView);
    document.body.appendChild(dialogRef.location.nativeElement);
    this.dialogRefs.push(dialogRef);
  }

  private removeDialog(dialogRef: ComponentRef<DialogComponent>) {
    this.appRef.detachView(dialogRef.hostView);
    dialogRef.destroy();
    this.dialogRefs = this.dialogRefs.filter(ref => ref !== dialogRef);
  }
}
