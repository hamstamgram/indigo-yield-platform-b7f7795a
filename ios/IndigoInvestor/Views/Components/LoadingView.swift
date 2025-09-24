//
//  LoadingView.swift
//  IndigoInvestor
//
//  Loading indicator view
//

import SwiftUI

struct LoadingView: View {
    @State private var isAnimating = false

    var body: some View {
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

            VStack(spacing: 30) {
                // Logo
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 120, height: 120)
                    .scaleEffect(isAnimating ? 1.1 : 1.0)
                    .animation(
                        Animation.easeInOut(duration: 1.5)
                            .repeatForever(autoreverses: true),
                        value: isAnimating
                    )

                // Loading indicator
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)

                Text("Loading...")
                    .font(.title3)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .opacity(0.9)
            }
        }
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Offline Banner

struct OfflineBanner: View {
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 18, weight: .semibold))

            Text("No Internet Connection")
                .font(.system(size: 14, weight: .medium))

            Spacer()
        }
        .foregroundColor(.white)
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(Color.orange)
        .shadow(radius: 5)
    }
}

#Preview {
    LoadingView()
}