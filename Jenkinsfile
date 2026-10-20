pipeline {
  agent { label 'macos && xcode' }

  options {
    timeout(time: 120, unit: 'MINUTES')
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  parameters {
    choice(name: 'BUILD_MODE', choices: ['verify', 'adhoc'], description: 'Unsigned archive validation or signed Ad Hoc IPA')
  }

  environment {
    BUNDLE_GEMFILE = "${WORKSPACE}/mobile/Gemfile"
    IOS_SCHEME = 'AtlasCMMS'
    IOS_BUNDLE_IDENTIFIER = 'com.cmms.atlas'
    APPLE_TEAM_ID = 'KXW8RH26AN'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Environment validation') {
      steps {
        sh '''
          set -euo pipefail
          test "$(uname -s)" = Darwin || { echo "iOS builds require a macOS agent; the Jenkins controller is not used." >&2; exit 1; }
          xcodebuild -version
          major="$(xcodebuild -version | awk '/^Xcode / { split($2, v, "."); print v[1] }')"
          test "$major" = 26 || { echo "Expected Xcode 26.x" >&2; exit 1; }
          node --version
          ruby --version
          bundle --version
        '''
      }
    }

    stage('Dependency installation') {
      steps {
        sh '''
          set -euo pipefail
          cd mobile
          npm ci
          if [ ! -f Gemfile.lock ]; then bundle lock; fi
          bundle install --jobs 4 --retry 3
          mkdir -p artifacts/ios
          cp Gemfile.lock artifacts/ios/Gemfile.lock.resolved
          bundle exec pod install --project-directory=ios
        '''
      }
    }

    stage('Unsigned iOS build verification') {
      when { expression { params.BUILD_MODE == 'verify' } }
      steps {
        dir('mobile/ios') {
          withEnv(['QPM_DEPS_PREPARED=1']) {
            sh 'bundle exec fastlane ios verify_build'
          }
        }
      }
    }

    stage('Signed Ad Hoc IPA') {
      when { expression { params.BUILD_MODE == 'adhoc' } }
      steps {
        dir('mobile/ios') {
          withCredentials([
            string(credentialsId: 'qpm-ios-match-git-url', variable: 'MATCH_GIT_URL'),
            string(credentialsId: 'qpm-ios-match-git-basic-authorization', variable: 'MATCH_GIT_BASIC_AUTHORIZATION'),
            string(credentialsId: 'qpm-ios-match-password', variable: 'MATCH_PASSWORD')
          ]) {
            withEnv(['QPM_DEPS_PREPARED=1']) {
              sh 'bundle exec fastlane ios build_adhoc'
            }
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'mobile/artifacts/ios/**/*.ipa,mobile/artifacts/ios/**/*.xcarchive.zip,mobile/artifacts/ios/logs/**,mobile/artifacts/ios/Podfile.lock.*,mobile/artifacts/ios/Gemfile.lock.*', allowEmptyArchive: true, fingerprint: true
      deleteDir()
    }
  }
}
