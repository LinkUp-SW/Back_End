pipeline {
    agent any
    environment {
        CI = "true"  
    }
    stages {
        stage('Checkout') {
            steps {
                sh ' rm -rf mywork'
                checkout scm      
                sh 'mkdir mywork && mv * mywork/ 2>/dev/null || true' 
                }
        }
       stage('Install Dependencies') { 
            steps {
                echo 'installing dependencies...' 
                sh '''
                    cd mywork
                    npm install
                '''
                 
            }
        }
        stage('Build') { 
            steps {
                 echo 'building...' 
                sh '''
                    cd mywork
                    npm run build
                    cd ..
                    rm -rf mywork
                 '''
            }
        }
    }
    post {
        success {
            script {
                 githubNotify context: 'Pipeline Wizard Speaking',
                         description: 'Build successful, good job :)',
                         status: 'SUCCESS',
                         repo: 'Back_End',
                         credentialsId: 'notify-token',
                         account: 'LinkUp-SW',
                         sha: env.GIT_COMMIT
            }
        }
        failure {
            script {
                githubNotify context: 'Pipeline Wizard Speaking',
                         description: 'Build failed, rage3 nafsak :(',
                         status: 'FAILURE',
                         repo: 'Back_End',
                         credentialsId: 'notify-token',
                         account: 'LinkUp-SW',
                         sha: env.GIT_COMMIT
            }
        }
    }

}
