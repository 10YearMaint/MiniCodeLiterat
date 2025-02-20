import { Component } from '@angular/core';
import { FilePickerComponent } from './components/file-picker/file-picker.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FilePickerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {}
