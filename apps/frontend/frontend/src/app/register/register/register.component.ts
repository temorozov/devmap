import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
    private fb = inject(FormBuilder);
    authService = inject(AuthService);
    router = inject(Router);

    registerForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    loading = false;
    error = '';

    passwordMatchValidator(g: any) {
        return g.get('password').value === g.get('confirmPassword').value
            ? null : { 'mismatch': true };
    }

    onSubmit() {
        if (this.registerForm.invalid) return;

        this.loading = true;
        this.error = '';

        const { email, password } = this.registerForm.value;

        this.authService.register({ email: email!, password: password! }).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading = false;
                this.error = err.error?.message || 'Registration failed. User may already exist.';
            }
        });
    }

    registerWithGoogle() {
        window.location.href = '/api/auth/google';
    }
}
