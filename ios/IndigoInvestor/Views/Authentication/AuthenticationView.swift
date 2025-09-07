//
//  AuthenticationView.swift
//  IndigoInvestor
//
//  Main authentication view with login form
//

import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var serviceLocator: ServiceLocator
    
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isLoading = false
    @State private var showBiometricOption = false
    @State private var showTwoFactorSheet = false
    @State private var twoFactorCode = ""
    
    @FocusState private var focusedField: Field?
    
    enum Field {
        case email
        case password
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color(red: 124/255, green: 58/255, blue: 237/255),
                        Color(red: 91/255, green: 33/255, blue: 182/255)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 30) {
                        // Logo and Title
                        VStack(spacing: 16) {
                            Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 100, height: 100)
                                .foregroundColor(.white)
                                .shadow(radius: 10)
                            
                            Text("Indigo Investor")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            
                            Text("Your Portfolio, Secured")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.9))
                        }
                        .padding(.top, 50)
                        
                        // Login Form
                        VStack(spacing: 20) {
                            // Email Field
                            VStack(alignment: .leading, spacing: 8) {
                                Label("Email", systemImage: "envelope.fill")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.8))
                                
                                TextField("your@email.com", text: $email)
                                    .textFieldStyle(CustomTextFieldStyle())
                                    .keyboardType(.emailAddress)
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                                    .focused($focusedField, equals: .email)
                                    .submitLabel(.next)
                                    .onSubmit {
                                        focusedField = .password
                                    }
                            }
                            
                            // Password Field
                            VStack(alignment: .leading, spacing: 8) {
                                Label("Password", systemImage: "lock.fill")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.8))
                                
                                HStack {
                                    if showPassword {
                                        TextField("Enter your password", text: $password)
                                            .textContentType(.password)
                                    } else {
                                        SecureField("Enter your password", text: $password)
                                            .textContentType(.password)
                                    }
                                    
                                    Button(action: {
                                        showPassword.toggle()
                                    }) {
                                        Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                            .foregroundColor(.white.opacity(0.6))
                                    }
                                }
                                .textFieldStyle(CustomTextFieldStyle())
                                .focused($focusedField, equals: .password)
                                .submitLabel(.done)
                                .onSubmit {
                                    handleLogin()
                                }
                            }
                            
                            // Login Button
                            Button(action: handleLogin) {
                                HStack {
                                    if isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                    } else {
                                        Text("Sign In")
                                            .fontWeight(.semibold)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.white)
                                .foregroundColor(Color(red: 124/255, green: 58/255, blue: 237/255))
                                .cornerRadius(12)
                                .shadow(color: .black.opacity(0.1), radius: 5, y: 3)
                            }
                            .disabled(isLoading || email.isEmpty || password.isEmpty)
                            
                            // Biometric Login Option
                            if serviceLocator.biometricManager.isAvailable &&
                               serviceLocator.keychainManager.isBiometricEnabled() {
                                Button(action: handleBiometricLogin) {
                                    HStack {
                                        Image(systemName: serviceLocator.biometricManager.biometricImage)
                                            .font(.title2)
                                        Text("Sign in with \(serviceLocator.biometricManager.biometricName)")
                                            .fontWeight(.medium)
                                    }
                                    .foregroundColor(.white)
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color.white.opacity(0.2))
                                    .cornerRadius(12)
                                }
                            }
                            
                            // Forgot Password
                            Button(action: {
                                // Handle forgot password
                            }) {
                                Text("Forgot Password?")
                                    .font(.footnote)
                                    .foregroundColor(.white.opacity(0.9))
                            }
                        }
                        .padding(.horizontal, 30)
                        .padding(.vertical, 20)
                        
                        Spacer(minLength: 50)
                    }
                }
            }
            .alert("Error", isPresented: $authViewModel.showError) {
                Button("OK") { }
            } message: {
                Text(authViewModel.errorMessage ?? "An error occurred")
            }
            .sheet(isPresented: $showTwoFactorSheet) {
                TwoFactorView(code: $twoFactorCode) { code in
                    Task {
                        try await authViewModel.verifyTwoFactor(code: code)
                    }
                }
            }
            .onChange(of: authViewModel.requiresTwoFactor) { requires in
                showTwoFactorSheet = requires
            }
        }
    }
    
    private func handleLogin() {
        guard !email.isEmpty, !password.isEmpty else { return }
        
        isLoading = true
        focusedField = nil
        
        Task {
            do {
                try await authViewModel.login(email: email, password: password)
            } catch {
                // Error is handled by AuthViewModel
            }
            isLoading = false
        }
    }
    
    private func handleBiometricLogin() {
        Task {
            do {
                try await authViewModel.authenticateWithBiometrics()
            } catch {
                // If biometric fails, show login form
            }
        }
    }
}

// MARK: - Custom Text Field Style

struct CustomTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color.white.opacity(0.95))
            .cornerRadius(10)
            .shadow(color: .black.opacity(0.05), radius: 3, y: 2)
    }
}

// MARK: - Two Factor View

struct TwoFactorView: View {
    @Binding var code: String
    let onSubmit: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isFocused: Bool
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.accentColor)
                    .padding(.top, 40)
                
                VStack(spacing: 8) {
                    Text("Two-Factor Authentication")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Enter the 6-digit code from your authenticator app")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                
                // Code Input
                HStack(spacing: 12) {
                    ForEach(0..<6, id: \.self) { index in
                        CodeDigitView(
                            digit: digitAt(index: index),
                            isActive: index == code.count
                        )
                    }
                }
                .onTapGesture {
                    isFocused = true
                }
                
                // Hidden TextField for input
                TextField("", text: $code)
                    .keyboardType(.numberPad)
                    .focused($isFocused)
                    .opacity(0)
                    .onChange(of: code) { newValue in
                        // Limit to 6 digits
                        if newValue.count > 6 {
                            code = String(newValue.prefix(6))
                        }
                        
                        // Auto-submit when 6 digits entered
                        if code.count == 6 {
                            onSubmit(code)
                        }
                    }
                
                Spacer()
                
                Button(action: {
                    onSubmit(code)
                }) {
                    Text("Verify")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(code.count == 6 ? Color.accentColor : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .disabled(code.count != 6)
                .padding(.horizontal)
                .padding(.bottom)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            isFocused = true
        }
    }
    
    private func digitAt(index: Int) -> String {
        if index < code.count {
            let stringIndex = code.index(code.startIndex, offsetBy: index)
            return String(code[stringIndex])
        }
        return ""
    }
}

struct CodeDigitView: View {
    let digit: String
    let isActive: Bool
    
    var body: some View {
        Text(digit.isEmpty ? "–" : digit)
            .font(.title)
            .fontWeight(.semibold)
            .frame(width: 45, height: 55)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isActive ? Color.accentColor : Color.clear, lineWidth: 2)
            )
    }
}

// MARK: - Preview

#Preview {
    AuthenticationView()
        .environmentObject(AuthViewModel())
        .environmentObject(ServiceLocator())
}
