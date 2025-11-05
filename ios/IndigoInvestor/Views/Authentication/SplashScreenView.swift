//
//  SplashScreenView.swift
//  IndigoInvestor
//
//  Created by Indigo Development Team
//  Screen 1/85: Splash Screen with branding and loading
//

import SwiftUI

struct SplashScreenView: View {
    @State private var isAnimating = false
    @State private var opacity: Double = 0
    @Binding var isActive: Bool

    var body: some View {
        ZStack {
            // Gradient background
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(hex: "1A1F3A"),
                    Color(hex: "2D3561")
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                // App logo
                Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 120, height: 120)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(hex: "4F46E5"), Color(hex: "7C3AED")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .scaleEffect(isAnimating ? 1.0 : 0.6)
                    .opacity(opacity)

                // App name
                VStack(spacing: 8) {
                    Text("Indigo")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Text("Institutional Yield Platform")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
                .opacity(opacity)

                Spacer()

                // Loading indicator
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.2)
                    .opacity(opacity)

                Text("Securing your connection...")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white.opacity(0.6))
                    .opacity(opacity)

                Spacer()
                    .frame(height: 60)
            }
            .padding()
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.0)) {
                opacity = 1.0
                isAnimating = true
            }

            // Simulate loading and transition
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                withAnimation {
                    isActive = false
                }
            }
        }
    }
}

// MARK: - Preview
struct SplashScreenView_Previews: PreviewProvider {
    static var previews: some View {
        SplashScreenView(isActive: .constant(true))
    }
}
