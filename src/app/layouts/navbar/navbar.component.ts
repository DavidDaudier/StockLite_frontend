import { NgIcon, provideIcons } from "@ng-icons/core";
import { Component } from '@angular/core';
import { hugeNotification01, hugePackageSent } from "@ng-icons/huge-icons";

@Component({
  selector: 'app-navbar',
  imports: [NgIcon],
  viewProviders: [
    provideIcons({
      hugeNotification01,
      hugePackageSent
    })
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

}
